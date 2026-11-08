// Admin sessions and login throttling on D1. All queries are prepared statements.
import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';
import { hmac, randomToken, verifyPassword } from './auth-crypto';

export const SESSION_COOKIE = 'admin_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;
const LOCKOUT_SECONDS = 15 * 60;

export interface AdminUser {
  id: number;
  email: string;
}

const now = () => Math.floor(Date.now() / 1000);

/** Hash the cookie token before it touches the database, so a leaked table cannot be replayed. */
const sessionId = (token: string) => hmac(env.AUTH_SECRET, `session:${token}`);

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

/** Returns the user when the credentials are right, otherwise null. */
export async function checkCredentials(email: string, password: string): Promise<AdminUser | null> {
  const row = await env.DB.prepare(`SELECT id, email, password_hash FROM admin_users WHERE email = ?`)
    .bind(email)
    .first<{ id: number; email: string; password_hash: string }>();
  const valid = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  return row && valid ? { id: row.id, email: row.email } : null;
}

export async function createSession(userId: number): Promise<{ token: string; expires: Date }> {
  const token = randomToken();
  const expiresAt = now() + SESSION_SECONDS;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM admin_sessions WHERE expires_at < ?`).bind(now()), // tidy up expired sessions
    env.DB.prepare(`INSERT INTO admin_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).bind(await sessionId(token), userId, expiresAt),
  ]);
  return { token, expires: new Date(expiresAt * 1000) };
}

export async function getSessionUser(token: string | undefined): Promise<AdminUser | null> {
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`,
  )
    .bind(await sessionId(token), now())
    .first<AdminUser>();
  return row ?? null;
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await env.DB.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(await sessionId(token)).run();
}

export function setSessionCookie(cookies: AstroCookies, token: string, expires: Date) {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: import.meta.env.PROD, // plain http on localhost would drop a Secure cookie
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export const clearSessionCookie = (cookies: AstroCookies) => cookies.delete(SESSION_COOKIE, { path: '/' });

// ---------- Failed-login limiting ----------

export const hashIp = (ip: string) => hmac(env.AUTH_SECRET, `ip:${ip}`);

/** True while this email or IP has too many recent failures. */
export async function isLockedOut(email: string, ipHash: string): Promise<boolean> {
  const since = now() - LOCKOUT_SECONDS;
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM login_attempts WHERE email = ? AND attempted_at > ?) AS by_email,
       (SELECT COUNT(*) FROM login_attempts WHERE ip_hash = ? AND attempted_at > ?) AS by_ip`,
  )
    .bind(email, since, ipHash, since)
    .first<{ by_email: number; by_ip: number }>();
  return !!row && (row.by_email >= MAX_FAILURES_PER_EMAIL || row.by_ip >= MAX_FAILURES_PER_IP);
}

export async function recordFailure(email: string, ipHash: string) {
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO login_attempts (email, ip_hash, attempted_at) VALUES (?, ?, ?)`).bind(email, ipHash, now()),
    env.DB.prepare(`DELETE FROM login_attempts WHERE attempted_at < ?`).bind(now() - 24 * 60 * 60), // old throttling data
  ]);
}

export async function clearFailures(email: string) {
  await env.DB.prepare(`DELETE FROM login_attempts WHERE email = ?`).bind(email).run();
}
