-- Admin authentication: users, sessions and failed-login tracking. Additive only.

CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- pbkdf2$iterations$salt$hash
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,                   -- HMAC of the cookie token; the raw token is never stored
  user_id INTEGER NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,           -- unix seconds
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_sessions_user_id ON admin_sessions (user_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions (expires_at);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  attempted_at INTEGER NOT NULL          -- unix seconds
);

CREATE INDEX idx_login_attempts_email ON login_attempts (email, attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts (ip_hash, attempted_at);
