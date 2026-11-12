/**
 * Database initialization and management for the AURA Auth API (Node.js).
 * Uses built-in node:sqlite (zero-compilation SQLite) for ultra-fast, zero-setup persistence.
 * Supports users, sessions, password resets, Google OAuth, client tracking, and audit logging.
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'auth.db');
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA busy_timeout = 30000;');
  }
  return dbInstance;
}

// --------------------------------------------------
// PASSWORD HASHING (scrypt with salt)
// --------------------------------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(storedHash, password) {
  if (!storedHash || !password) return false;
  try {
    if (storedHash.startsWith('scrypt$')) {
      const parts = storedHash.split('$');
      if (parts.length === 3) {
        const salt = parts[1];
        const originalHash = parts[2];
        const computedHash = crypto.scryptSync(String(password), salt, 64).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(computedHash, 'hex'));
      }
    }
  } catch (e) {
    return false;
  }
  return false;
}

// --------------------------------------------------
// INITIALIZE DATABASE
// --------------------------------------------------
export function initDb() {
  const db = getDb();

  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      auth_provider TEXT DEFAULT 'local',
      google_id TEXT,
      github_id TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );
  `);

  // 2. Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      device_label TEXT DEFAULT 'Desktop Browser',
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 3. Password Resets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      reset_code TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      used INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 4. Audit Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
  `);

  // Seed demo user if not present
  const demoStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  const demoUser = demoStmt.get('demo@glossyapi.dev');
  if (!demoUser) {
    const hashed = hashPassword('GlossyPass123!');
    db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, auth_provider, created_at)
      VALUES (?, ?, ?, ?, 'local', ?)
    `).run('AlexGlossy', 'demo@glossyapi.dev', hashed, 'Alex Mercer', new Date().toISOString());
  }

  cleanupExpiredRecords();
}

// --------------------------------------------------
// CLEANUP ROUTINE
// --------------------------------------------------
export function cleanupExpiredRecords() {
  const db = getDb();
  try {
    const nowIso = new Date().toISOString();
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso);
    db.prepare('DELETE FROM password_resets WHERE expires_at < ? OR used = 1').run(nowIso);
  } catch (e) {}
}

// --------------------------------------------------
// USER OPERATIONS
// --------------------------------------------------
export function createUser(username, email, password, fullName = null, ipAddress = '127.0.0.1') {
  const cleanUsername = (username || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanFullName = (fullName || '').trim() || cleanUsername;

  if (!cleanUsername || cleanUsername.length < 3) {
    return { user: null, error: 'Username must be at least 3 characters long.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return { user: null, error: 'Username may only contain letters, numbers, hyphens, and underscores.' };
  }
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { user: null, error: 'Please provide a valid email address.' };
  }
  if (!password || String(password).length < 6) {
    return { user: null, error: 'Password must be at least 6 characters long.' };
  }

  const db = getDb();
  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existingUser) return { user: null, error: 'Username is already taken' };

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingEmail) return { user: null, error: 'Email is already registered' };

    const hashedPw = hashPassword(password);
    const nowIso = new Date().toISOString();

    const insertResult = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, auth_provider, created_at)
      VALUES (?, ?, ?, ?, 'local', ?)
    `).run(cleanUsername, cleanEmail, hashedPw, cleanFullName, nowIso);

    const userId = Number(insertResult.lastInsertRowid);
    logAuditEvent(userId, 'register_local', `Account created with username @${cleanUsername}`, ipAddress);
    return { user: getUserById(userId), error: null };
  } catch (err) {
    return { user: null, error: err.message || 'Registration failed' };
  }
}

export function findOrCreateGoogleUser(email, fullName = null, googleId = null, avatarUrl = null, ipAddress = '127.0.0.1') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanGoogleId = (googleId || '').trim() || null;
  const cleanAvatar = (avatarUrl || '').trim() || null;
  const cleanName = (fullName || '').trim() || null;

  const db = getDb();
  const nowIso = new Date().toISOString();

  let existing = null;
  if (cleanGoogleId) {
    existing = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(cleanGoogleId, cleanEmail);
  } else {
    existing = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  }

  if (existing) {
    const userId = existing.id;
    db.prepare(`
      UPDATE users 
      SET last_login = ?,
          google_id = COALESCE(?, google_id),
          avatar_url = COALESCE(?, avatar_url),
          full_name = COALESCE(?, full_name)
      WHERE id = ?
    `).run(nowIso, cleanGoogleId, cleanAvatar, cleanName, userId);

    logAuditEvent(userId, 'login_google', `Signed in with Google OAuth (${cleanEmail})`, ipAddress);
    return { user: getUserById(userId), isNew: false };
  }

  let baseUsername = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : 'google_user';
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 15) || 'google_user';
  let candidateUsername = baseUsername;

  let counter = 1;
  while (true) {
    const row = db.prepare('SELECT id FROM users WHERE username = ?').get(candidateUsername);
    if (!row) break;
    candidateUsername = `${baseUsername}_${counter}`;
    counter++;
  }

  const dummyHash = hashPassword(crypto.randomBytes(32).toString('hex'));
  const displayName = cleanName || candidateUsername.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const insert = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, auth_provider, google_id, avatar_url, created_at, last_login)
    VALUES (?, ?, ?, ?, 'google', ?, ?, ?, ?)
  `).run(candidateUsername, cleanEmail, dummyHash, displayName, cleanGoogleId, cleanAvatar, nowIso, nowIso);

  const newId = Number(insert.lastInsertRowid);
  logAuditEvent(newId, 'register_google', `Account provisioned via Google OAuth (${cleanEmail})`, ipAddress);
  return { user: getUserById(newId), isNew: true };
}

export function authenticateUser(identifier, password, ipAddress = '127.0.0.1') {
  const ident = (identifier || '').trim();
  if (!ident) return { user: null, error: 'Email or username is required.' };

  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(ident.toLowerCase(), ident);

  if (!row) {
    return { user: null, error: 'Invalid credentials. Account not found.' };
  }

  if (!verifyPassword(row.password_hash, password)) {
    return { user: null, error: 'Invalid credentials. Password incorrect.' };
  }

  const nowIso = new Date().toISOString();
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(nowIso, row.id);

  const userData = { ...row };
  delete userData.password_hash;
  userData.last_login = nowIso;

  logAuditEvent(row.id, 'login_local', `Authenticated with password as @${row.username}`, ipAddress);
  return { user: userData, error: null };
}

export function updateUserProfile(userId, username = null, fullName = null, email = null, avatarUrl = null, ipAddress = '127.0.0.1') {
  const db = getDb();
  const existing = db.prepare('SELECT id, username, email, full_name, avatar_url FROM users WHERE id = ?').get(userId);
  if (!existing) return { user: null, error: 'User not found.' };

  let newUsername = existing.username;
  if (username !== null && username !== undefined) {
    const clean = username.trim();
    if (!clean) return { user: null, error: 'Username cannot be empty.' };
    if (clean.length < 3) return { user: null, error: 'Username must contain at least 3 characters.' };
    if (!/^[a-zA-Z0-9_-]+$/.test(clean)) return { user: null, error: 'Username may only contain letters, numbers, hyphens, and underscores.' };
    newUsername = clean;
  }

  let newFullName = existing.full_name;
  if (fullName !== null && fullName !== undefined) {
    newFullName = fullName.trim();
  }

  let newEmail = existing.email;
  if (email !== null && email !== undefined) {
    const clean = email.trim().toLowerCase();
    if (!clean) return { user: null, error: 'Email cannot be empty.' };
    if (!EMAIL_REGEX.test(clean)) return { user: null, error: 'Please provide a valid email address.' };
    newEmail = clean;
  }

  const newAvatar = (avatarUrl && typeof avatarUrl === 'string') ? avatarUrl.trim() : existing.avatar_url;

  if (newUsername.toLowerCase() !== existing.username.toLowerCase()) {
    const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, userId);
    if (clash) return { user: null, error: 'Username is already taken.' };
  }

  if (newEmail.toLowerCase() !== existing.email.toLowerCase()) {
    const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, userId);
    if (clash) return { user: null, error: 'Email is already registered by another account.' };
  }

  db.prepare(`
    UPDATE users
    SET username = ?, full_name = ?, email = ?, avatar_url = ?
    WHERE id = ?
  `).run(newUsername, newFullName, newEmail, newAvatar, userId);

  logAuditEvent(userId, 'profile_update', `Profile updated for @${newUsername}`, ipAddress);
  return { user: getUserById(userId), error: null };
}

export function changeUserPassword(userId, currentPassword, newPassword, ipAddress = '127.0.0.1') {
  if (!newPassword || String(newPassword).length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
  if (!row) return { success: false, error: 'User not found.' };

  if (!verifyPassword(row.password_hash, currentPassword)) {
    return { success: false, error: 'Current password does not match.' };
  }

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  logAuditEvent(userId, 'password_change', 'Password successfully changed via account settings', ipAddress);
  return { success: true, error: null };
}

// --------------------------------------------------
// SESSION MANAGEMENT & TRACKING
// --------------------------------------------------
export function createSession(userId, durationHours = 24, deviceLabel = 'Web Client', ipAddress = '127.0.0.1') {
  const db = getDb();
  const token = `glossy_${crypto.randomBytes(20).toString('hex')}`;
  const now = new Date();
  const expires = new Date(now.getTime() + durationHours * 3600 * 1000);

  db.prepare(`
    INSERT INTO sessions (token, user_id, device_label, ip_address, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, userId, deviceLabel, ipAddress || '127.0.0.1', now.toISOString(), expires.toISOString());

  return { token, expiresAt: expires.toISOString() };
}

export function validateSession(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  const db = getDb();
  const row = db.prepare(`
    SELECT s.token, s.expires_at, s.device_label, s.ip_address,
           u.id, u.username, u.email, u.full_name, u.auth_provider, u.avatar_url, u.created_at, u.last_login
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(cleanToken);

  if (!row) return null;

  const nowTime = new Date().getTime();
  const expiresTime = new Date(row.expires_at).getTime();

  if (nowTime > expiresTime) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(cleanToken);
    return null;
  }

  return row;
}

export function refreshSessionToken(oldToken, extensionHours = 24, ipAddress = '127.0.0.1') {
  const user = validateSession(oldToken);
  if (!user) return { token: null, expiresAt: null, error: 'Session is invalid or expired.' };

  destroySession(oldToken, ipAddress);
  const { token, expiresAt } = createSession(user.id, extensionHours, user.device_label || 'Refreshed Session', ipAddress);
  logAuditEvent(user.id, 'token_refresh', 'Rotated session token and extended expiration', ipAddress);
  return { token, expiresAt, error: null };
}

export function destroySession(token, ipAddress = '127.0.0.1') {
  if (!token) return false;
  const db = getDb();
  const row = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token.trim());
  if (!row) return false;

  db.prepare('DELETE FROM sessions WHERE token = ?').run(token.trim());
  logAuditEvent(row.user_id, 'logout', 'Session token revoked / signed out', ipAddress);
  return true;
}

export function revokeAllSessions(userId, exceptToken = null, ipAddress = '127.0.0.1') {
  const db = getDb();
  let count = 0;
  if (exceptToken) {
    const res = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, exceptToken.trim());
    count = Number(res.changes);
  } else {
    const res = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    count = Number(res.changes);
  }
  logAuditEvent(userId, 'revoke_all_sessions', `Terminated ${count} active session(s)`, ipAddress);
  return count;
}

export function getUserSessions(userId) {
  const db = getDb();
  const nowIso = new Date().toISOString();
  return db.prepare(`
    SELECT token, device_label, ip_address, created_at, expires_at
    FROM sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).all(userId, nowIso);
}

// --------------------------------------------------
// CLIENT REGISTRY & SYSTEM-WIDE TRACKING
// --------------------------------------------------
export function getActiveClients(limit = 100) {
  cleanupExpiredRecords();
  const db = getDb();
  const nowIso = new Date().toISOString();

  const rows = db.prepare(`
    SELECT 
      s.token,
      s.user_id,
      s.device_label,
      s.ip_address,
      s.created_at AS session_started_at,
      s.expires_at,
      u.username,
      u.email,
      u.full_name,
      u.auth_provider,
      u.avatar_url,
      u.last_login
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.expires_at > ?
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(nowIso, limit);

  return rows.map(r => {
    const token = r.token;
    const masked_token = token.length > 16 ? `${token.substring(0, 10)}...${token.substring(token.length - 6)}` : token;
    return { ...r, masked_token };
  });
}

// --------------------------------------------------
// USER RETRIEVAL & SEARCH
// --------------------------------------------------
export function lookupUser(identifier) {
  if (!identifier) return null;
  const ident = String(identifier).trim();
  if (!ident) return null;

  cleanupExpiredRecords();
  const db = getDb();

  let user = db.prepare(`
    SELECT id, username, email, full_name, auth_provider, google_id, github_id, avatar_url, created_at, last_login
    FROM users
    WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE
  `).get(ident.toLowerCase(), ident);

  if (!user && /^\d+$/.test(ident)) {
    user = db.prepare(`
      SELECT id, username, email, full_name, auth_provider, google_id, github_id, avatar_url, created_at, last_login
      FROM users
      WHERE id = ?
    `).get(Number(ident));
  }

  if (!user) return null;

  const nowIso = new Date().toISOString();
  const sessions = db.prepare(`
    SELECT token, device_label, ip_address, created_at, expires_at
    FROM sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).all(user.id, nowIso).map(s => ({
    ...s,
    masked_token: s.token.length > 16 ? `${s.token.substring(0, 10)}...${s.token.substring(s.token.length - 6)}` : s.token
  }));

  const logs = db.prepare(`
    SELECT event_type, description, ip_address, created_at
    FROM audit_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 8
  `).all(user.id);

  return {
    user,
    is_currently_logged_in: sessions.length > 0,
    active_sessions_count: sessions.length,
    active_sessions: sessions,
    recent_activity: logs
  };
}

export function searchUsers(query = '', limit = 30) {
  cleanupExpiredRecords();
  const db = getDb();
  const nowIso = new Date().toISOString();
  const q = (query || '').trim().toLowerCase();

  let rows = [];
  if (!q) {
    rows = db.prepare(`
      SELECT id, username, email, full_name, auth_provider, avatar_url, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  } else {
    const pattern = `%${q}%`;
    rows = db.prepare(`
      SELECT id, username, email, full_name, auth_provider, avatar_url, created_at, last_login
      FROM users
      WHERE email LIKE ? OR username LIKE ? OR full_name LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(pattern, pattern, pattern, limit);
  }

  return rows.map(u => {
    const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM sessions WHERE user_id = ? AND expires_at > ?').get(u.id, nowIso);
    const cnt = countRow ? Number(countRow.cnt) : 0;
    return {
      ...u,
      is_logged_in: cnt > 0,
      active_sessions_count: cnt
    };
  });
}

// --------------------------------------------------
// PASSWORD RESETS
// --------------------------------------------------
export function createPasswordReset(email, ipAddress = '127.0.0.1') {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { code: null, error: 'Email address is required.' };

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (!user) return { code: null, error: 'No account exists with this email address.' };

  db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  const resetCode = String(crypto.randomInt(100000, 999999));
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);

  db.prepare(`
    INSERT INTO password_resets (reset_code, user_id, created_at, expires_at, used)
    VALUES (?, ?, ?, ?, 0)
  `).run(resetCode, user.id, now.toISOString(), expires.toISOString());

  logAuditEvent(user.id, 'password_reset_request', `Requested 6-digit verification code (${resetCode})`, ipAddress);
  return { code: resetCode, error: null };
}

export function resetPasswordWithCode(resetCode, newPassword, ipAddress = '127.0.0.1') {
  const cleanCode = (resetCode || '').trim();
  if (!cleanCode) return { success: false, error: 'Reset code is required.' };
  if (!newPassword || String(newPassword).length < 6) return { success: false, error: 'New password must be at least 6 characters long.' };

  const db = getDb();
  const nowIso = new Date().toISOString();
  const resetRow = db.prepare('SELECT * FROM password_resets WHERE reset_code = ? AND used = 0 AND expires_at > ?').get(cleanCode, nowIso);

  if (!resetRow) return { success: false, error: 'Invalid or expired reset code.' };

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, resetRow.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE reset_code = ?').run(cleanCode);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(resetRow.user_id);

  logAuditEvent(resetRow.user_id, 'password_reset_success', 'Password updated with verification code; old sessions revoked', ipAddress);
  return { success: true, error: null };
}

// --------------------------------------------------
// AUDIT LOGS & STATS
// --------------------------------------------------
export function logAuditEvent(userId, eventType, description, ipAddress = '127.0.0.1') {
  if (!userId) return;
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, event_type, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, eventType, description, ipAddress || '127.0.0.1', new Date().toISOString());
  } catch (e) {}
}

export function getUserAuditLogs(userId, limit = 15) {
  const db = getDb();
  return db.prepare(`
    SELECT event_type, description, ip_address, created_at
    FROM audit_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);
}

export function getUserById(userId) {
  if (!userId) return null;
  const db = getDb();
  return db.prepare(`
    SELECT id, username, email, full_name, auth_provider, avatar_url, created_at, last_login 
    FROM users 
    WHERE id = ?
  `).get(userId);
}

export function getStats() {
  cleanupExpiredRecords();
  const db = getDb();
  const nowIso = new Date().toISOString();

  const totalUsersRow = db.prepare('SELECT COUNT(*) AS total_users FROM users').get();
  const activeSessRow = db.prepare('SELECT COUNT(*) AS active_sessions FROM sessions WHERE expires_at > ?').get(nowIso);
  const auditLogsRow = db.prepare('SELECT COUNT(*) AS total_audit_logs FROM audit_logs').get();

  return {
    total_users: totalUsersRow ? Number(totalUsersRow.total_users) : 0,
    active_sessions: activeSessRow ? Number(activeSessRow.active_sessions) : 0,
    total_audit_logs: auditLogsRow ? Number(auditLogsRow.total_audit_logs) : 0
  };
}
