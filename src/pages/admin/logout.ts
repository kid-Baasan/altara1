import type { APIRoute } from 'astro';
import { SESSION_COOKIE, clearSessionCookie, deleteSession } from '../../lib/auth';

export const prerender = false;

// POST only (a link or image tag cannot log you out); Astro's origin check blocks cross-site posts.
export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    await deleteSession(cookies.get(SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('[logout] failed:', error);
  }
  clearSessionCookie(cookies);
  return redirect('/admin/login', 303);
};
