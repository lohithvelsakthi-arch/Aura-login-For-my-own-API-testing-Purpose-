/**
 * AURA Auth API - Node.js Express Backend
 * Implements complete authentication, Google OAuth 2.0, active client tracking,
 * email/username lookup, session management, and security audit logs.
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  initDb,
  createUser,
  findOrCreateGoogleUser,
  authenticateUser,
  updateUserProfile,
  changeUserPassword,
  createSession,
  validateSession,
  refreshSessionToken,
  destroySession,
  revokeAllSessions,
  getUserSessions,
  getActiveClients,
  lookupUser,
  searchUsers,
  createPasswordReset,
  resetPasswordWithCode,
  getUserAuditLogs,
  getUserById,
  getStats
} from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const SERVER_START_TIME = Date.now();

// In-memory or env-based Google Client ID
let googleClientId = process.env.GOOGLE_CLIENT_ID || '';

// Initialize database
initDb();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Client IP helper
function getClientIp(req) {
  try {
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (forwarded) {
      return String(forwarded).split(',')[0].trim();
    }
    if (req.socket && req.socket.remoteAddress) {
      return req.socket.remoteAddress;
    }
    if (req.ip) return req.ip;
  } catch (e) { }
  return '127.0.0.1';
}

// Token extractor helper
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }
  const xAuth = req.headers['x-auth-token'];
  if (xAuth) {
    return String(xAuth).trim();
  }
  if (req.body && req.body.token) {
    return String(req.body.token).trim();
  }
  if (req.query && req.query.token) {
    return String(req.query.token).trim();
  }
  return null;
}

// Google GIS JWT payload parser
function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

// Authentication middleware
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Bearer token required.'
    });
  }

  const user = validateSession(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token.'
    });
  }

  req.user = user;
  req.token = token;
  next();
}

// --------------------------------------------------
// HEALTH & STATS
// --------------------------------------------------
app.get('/api/auth/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const stats = getStats();
  res.json({
    status: 'healthy',
    runtime: 'Node.js ' + process.version,
    framework: 'Express',
    uptime_seconds: uptimeSeconds,
    database: 'node:sqlite (WAL mode active)',
    google_oauth_configured: Boolean(googleClientId),
    stats
  });
});

// --------------------------------------------------
// GOOGLE OAUTH CONFIG
// --------------------------------------------------
app.get('/api/auth/oauth/google/config', (req, res) => {
  res.json({
    success: true,
    client_id: googleClientId || null,
    interactive_simulator_ready: true
  });
});

app.post('/api/auth/oauth/google/config', (req, res) => {
  const newClientId = (req.body?.client_id || '').trim();
  googleClientId = newClientId;
  res.json({
    success: true,
    client_id: googleClientId || null,
    message: 'Google Client ID updated successfully.'
  });
});

// --------------------------------------------------
// GOOGLE OAUTH AUTHENTICATION / REGISTRATION
// --------------------------------------------------
app.post('/api/auth/oauth/google', (req, res) => {
  const data = req.body || {};
  const clientIp = getClientIp(req);

  let email = null;
  let name = null;
  let googleId = null;
  let picture = null;

  const credential = data.credential;
  if (credential && typeof credential === 'string') {
    const claims = parseJwtPayload(credential);
    if (claims) {
      email = claims.email;
      name = claims.name;
      googleId = claims.sub;
      picture = claims.picture;
    }
  }

  if (!email) {
    email = (data.email || '').trim();
    name = (data.name || '').trim();
    googleId = (data.google_id || '').trim() || `g_${Date.now()}`;
    picture = (data.picture || '').trim();
  }

  const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'A valid Google account email is required.'
    });
  }

  const { user, isNew } = findOrCreateGoogleUser(email, name, googleId, picture, clientIp);

  const userAgent = req.headers['user-agent'] || 'Web Browser';
  const deviceLabel = userAgent.includes('Mobile') ? 'Google OAuth • Mobile' : 'Google OAuth • Desktop';
  const { token, expiresAt } = createSession(user.id, 168, deviceLabel, clientIp);

  const welcomeMsg = isNew
    ? `Account created! Welcome, ${user.full_name || user.username}!`
    : `Welcome back, ${user.full_name || user.username}!`;

  res.json({
    success: true,
    is_new_user: isNew,
    message: welcomeMsg,
    token,
    expires_at: expiresAt,
    user
  });
});

// --------------------------------------------------
// LOCAL REGISTRATION
// --------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const data = req.body || {};
  const clientIp = getClientIp(req);

  const username = (data.username || '').trim();
  const email = (data.email || '').trim();
  const password = data.password || '';
  const fullName = (data.full_name || '').trim();

  const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  if (!username || username.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Username must be at least 3 characters long.'
    });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: 'Username may only contain letters, numbers, hyphens, and underscores.'
    });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.'
    });
  }

  if (!password || String(password).length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long.'
    });
  }

  const { user, error } = createUser(username, email, password, fullName, clientIp);
  if (error) {
    return res.status(409).json({
      success: false,
      error
    });
  }

  const { token, expiresAt } = createSession(user.id, 24, 'Web Client', clientIp);

  res.status(201).json({
    success: true,
    is_new_user: true,
    message: 'Account created successfully!',
    token,
    expires_at: expiresAt,
    user
  });
});

// --------------------------------------------------
// LOCAL LOGIN
// --------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const data = req.body || {};
  const clientIp = getClientIp(req);

  const identifier = (data.identifier || '').trim();
  const password = data.password || '';
  const remember = Boolean(data.remember);

  if (!identifier) {
    return res.status(400).json({
      success: false,
      error: 'Email or username is required.'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required.'
    });
  }

  const { user, error } = authenticateUser(identifier, password, clientIp);
  if (error) {
    return res.status(401).json({
      success: false,
      error
    });
  }

  const durationHours = remember ? 168 : 24;
  const userAgent = req.headers['user-agent'] || 'Web Browser';
  const deviceLabel = userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser';
  const { token, expiresAt } = createSession(user.id, durationHours, deviceLabel, clientIp);

  res.json({
    success: true,
    is_new_user: false,
    message: `Welcome back, ${user.full_name || user.username}!`,
    token,
    expires_at: expiresAt,
    user
  });
});

// --------------------------------------------------
// CLIENT TRACKING & REGISTRY
// --------------------------------------------------
app.get('/api/auth/clients', (req, res) => {
  const clients = getActiveClients(100);
  res.json({
    success: true,
    total_active_clients: clients.length,
    clients
  });
});

// --------------------------------------------------
// USER LOOKUP & RETRIEVAL (BY EMAIL OR USERNAME)
// --------------------------------------------------
app.get('/api/auth/users/lookup', (req, res) => {
  const identifier = (
    req.query.identifier ||
    req.query.email ||
    req.query.username ||
    req.query.q ||
    ''
  ).trim();

  if (!identifier) {
    return res.status(400).json({
      success: false,
      error: "Please provide an email or username via '?identifier=', '?email=', or '?username=' query parameter."
    });
  }

  const result = lookupUser(identifier);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: `No user account found matching '${identifier}'.`
    });
  }

  res.json({
    success: true,
    data: result
  });
});

app.get('/api/auth/users/search', (req, res) => {
  const query = (req.query.q || req.query.query || '').trim();
  const users = searchUsers(query, 30);
  res.json({
    success: true,
    total_matches: users.length,
    users
  });
});

app.get('/api/auth/users/:identifier(*)', (req, res) => {
  const identifier = (req.params.identifier || '').trim();
  const result = lookupUser(identifier);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: `User '${identifier}' was not found in the database.`
    });
  }

  res.json({
    success: true,
    data: result
  });
});

// --------------------------------------------------
// CURRENT USER PROFILE (/me)
// --------------------------------------------------
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// --------------------------------------------------
// UPDATE PROFILE (/profile & /me)
// --------------------------------------------------
function handleProfileUpdate(req, res) {
  const data = req.body || {};
  const clientIp = getClientIp(req);
  const user = req.user;

  const rawUsername = data.username;
  const rawFullName = data.full_name;
  const rawEmail = data.email;
  const rawAvatar = data.avatar_url;

  const username = (rawUsername !== undefined && rawUsername !== null && typeof rawUsername === 'string')
    ? rawUsername.trim()
    : user.username;
  const fullName = (rawFullName !== undefined && rawFullName !== null && typeof rawFullName === 'string')
    ? rawFullName.trim()
    : user.full_name;
  const email = (rawEmail !== undefined && rawEmail !== null && typeof rawEmail === 'string')
    ? rawEmail.trim().toLowerCase()
    : user.email;
  const avatarUrl = (rawAvatar !== undefined && rawAvatar !== null && typeof rawAvatar === 'string')
    ? rawAvatar.trim()
    : user.avatar_url;

  const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  if (username && username.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Username must contain at least 3 characters.',
      message: 'Username must contain at least 3 characters.'
    });
  }

  if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: 'Username may only contain letters, numbers, hyphens, and underscores.',
      message: 'Username may only contain letters, numbers, hyphens, and underscores.'
    });
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.',
      message: 'Please provide a valid email address.'
    });
  }

  const { user: updatedUser, error } = updateUserProfile(user.id, username, fullName, email, avatarUrl, clientIp);
  if (error) {
    return res.status(409).json({
      success: false,
      error,
      message: error
    });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    user: updatedUser
  });
}

app.put('/api/auth/profile', requireAuth, handleProfileUpdate);
app.patch('/api/auth/profile', requireAuth, handleProfileUpdate);
app.post('/api/auth/profile', requireAuth, handleProfileUpdate);
app.put('/api/auth/me', requireAuth, handleProfileUpdate);
app.patch('/api/auth/me', requireAuth, handleProfileUpdate);
app.post('/api/auth/me', requireAuth, handleProfileUpdate);

// --------------------------------------------------
// CHANGE PASSWORD
// --------------------------------------------------
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const data = req.body || {};
  const clientIp = getClientIp(req);
  const currentPassword = data.current_password || '';
  const newPassword = data.new_password || '';

  if (!currentPassword) {
    return res.status(400).json({ success: false, error: 'Current password is required.' });
  }

  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
  }

  const { success, error } = changeUserPassword(req.user.id, currentPassword, newPassword, clientIp);
  if (!success) {
    return res.status(400).json({ success: false, error: error || 'Failed to change password.' });
  }

  res.json({
    success: true,
    message: 'Password changed successfully.'
  });
});

// --------------------------------------------------
// REFRESH TOKEN
// --------------------------------------------------
app.post('/api/auth/refresh', (req, res) => {
  const clientIp = getClientIp(req);
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Bearer token is required to refresh session.'
    });
  }

  const { token: newToken, expiresAt, error } = refreshSessionToken(token, 24, clientIp);
  if (error) {
    return res.status(401).json({
      success: false,
      error
    });
  }

  res.json({
    success: true,
    message: 'Token refreshed successfully.',
    token: newToken,
    expires_at: expiresAt
  });
});

// --------------------------------------------------
// ACTIVE USER SESSIONS
// --------------------------------------------------
app.get('/api/auth/sessions', requireAuth, (req, res) => {
  const sessions = getUserSessions(req.user.id);
  res.json({
    success: true,
    total_active_sessions: sessions.length,
    sessions
  });
});

app.post('/api/auth/sessions/revoke-all', requireAuth, (req, res) => {
  const clientIp = getClientIp(req);
  const currentToken = extractToken(req);
  const revokedCount = revokeAllSessions(req.user.id, currentToken, clientIp);
  res.json({
    success: true,
    message: `Successfully revoked ${revokedCount} other active session(s).`,
    revoked_count: revokedCount
  });
});

// --------------------------------------------------
// SECURITY AUDIT LOGS
// --------------------------------------------------
app.get('/api/auth/audit-logs', requireAuth, (req, res) => {
  const logs = getUserAuditLogs(req.user.id, 15);
  res.json({
    success: true,
    audit_logs: logs
  });
});

// --------------------------------------------------
// FORGOT & RESET PASSWORD
// --------------------------------------------------
app.post('/api/auth/forgot-password', (req, res) => {
  const clientIp = getClientIp(req);
  const email = (req.body?.email || '').trim();

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const { code, error } = createPasswordReset(email, clientIp);
  if (error) {
    return res.status(404).json({ success: false, error });
  }

  res.json({
    success: true,
    message: `Verification code generated for ${email}.`,
    reset_code: code,
    expires_in_minutes: 15
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const clientIp = getClientIp(req);
  const resetCode = (req.body?.reset_code || '').trim();
  const newPassword = req.body?.new_password || '';

  if (!resetCode) {
    return res.status(400).json({ success: false, error: 'Reset code is required.' });
  }

  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
  }

  const { success, error } = resetPasswordWithCode(resetCode, newPassword, clientIp);
  if (!success) {
    return res.status(400).json({ success: false, error });
  }

  res.json({
    success: true,
    message: 'Password updated successfully! All active sessions have been securely revoked.'
  });
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------
app.post('/api/auth/logout', (req, res) => {
  const clientIp = getClientIp(req);
  const token = extractToken(req);

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'No token provided.'
    });
  }

  const success = destroySession(token, clientIp);
  res.json({
    success: true,
    message: success ? 'Session terminated successfully.' : 'Session was already expired or inactive.'
  });
});

// --------------------------------------------------
// API SPECIFICATION
// --------------------------------------------------
app.get('/api/auth/spec', (req, res) => {
  const endpoints = [
    {
      name: 'Google OAuth Sign-Up / Sign-In',
      method: 'POST',
      path: '/api/auth/oauth/google',
      auth_required: false,
      description: 'Authenticates or registers user using Google profile or GIS JWT payload.',
      sample_body: {
        email: 'alex.mercer.dev@gmail.com',
        name: 'Alex Mercer',
        google_id: '10492847291048291048',
        picture: 'https://lh3.googleusercontent.com/a/default-user'
      }
    },
    {
      name: 'List Active Logged-In Clients',
      method: 'GET',
      path: '/api/auth/clients',
      auth_required: false,
      description: 'Retrieves all currently active logged-in client sessions across the system.',
      sample_body: null
    },
    {
      name: 'Lookup User by Email or Username',
      method: 'GET',
      path: '/api/auth/users/lookup',
      auth_required: false,
      description: "Checks and retrieves user details, active sessions, and activity via '?identifier='.",
      sample_body: null
    },
    {
      name: 'Direct User Lookup by Path',
      method: 'GET',
      path: '/api/auth/users/<identifier>',
      auth_required: false,
      description: 'Retrieves user and active session status directly (e.g. /api/auth/users/demo@glossyapi.dev).',
      sample_body: null
    },
    {
      name: 'Search Users',
      method: 'GET',
      path: '/api/auth/users/search',
      auth_required: false,
      description: 'Searches users by partial email, username, or full name.',
      sample_body: null
    },
    {
      name: 'User Login',
      method: 'POST',
      path: '/api/auth/login',
      auth_required: false,
      description: 'Authenticates user with username/email and password.',
      sample_body: {
        identifier: 'demo@glossyapi.dev',
        password: 'GlossyPass123!',
        remember: true
      }
    },
    {
      name: 'User Registration',
      method: 'POST',
      path: '/api/auth/register',
      auth_required: false,
      description: 'Registers a new user account.',
      sample_body: {
        username: 'sarah_connor',
        email: 'sarah@cyberdyne.org',
        password: 'SafePassword2026!',
        full_name: 'Sarah Connor'
      }
    },
    {
      name: 'Get Authenticated Profile',
      method: 'GET',
      path: '/api/auth/me',
      auth_required: true,
      description: 'Returns current user details using Bearer token.',
      sample_body: null
    },
    {
      name: 'Update User Profile',
      method: 'PUT',
      path: '/api/auth/profile',
      auth_required: true,
      description: 'Updates username, full name, or email for current user.',
      sample_body: {
        username: 'alex_updated',
        full_name: 'Alex Mercer Jr.'
      }
    },
    {
      name: 'Change Password',
      method: 'POST',
      path: '/api/auth/change-password',
      auth_required: true,
      description: 'Changes password for current user verified by old password.',
      sample_body: {
        current_password: 'OldPassword123!',
        new_password: 'NewSecretPassword2026!'
      }
    },
    {
      name: 'Refresh Token',
      method: 'POST',
      path: '/api/auth/refresh',
      auth_required: true,
      description: 'Rotates the active session token.',
      sample_body: null
    },
    {
      name: 'Active User Sessions',
      method: 'GET',
      path: '/api/auth/sessions',
      auth_required: true,
      description: 'Lists active sessions for the user.',
      sample_body: null
    },
    {
      name: 'Revoke All Other Sessions',
      method: 'POST',
      path: '/api/auth/sessions/revoke-all',
      auth_required: true,
      description: 'Signs out of all devices except the current session.',
      sample_body: null
    },
    {
      name: 'Security Audit Logs',
      method: 'GET',
      path: '/api/auth/audit-logs',
      auth_required: true,
      description: 'Lists recent security events for the user.',
      sample_body: null
    },
    {
      name: 'Forgot Password',
      method: 'POST',
      path: '/api/auth/forgot-password',
      auth_required: false,
      description: 'Generates a 6-digit OTP reset code.',
      sample_body: { email: 'demo@glossyapi.dev' }
    },
    {
      name: 'Reset Password',
      method: 'POST',
      path: '/api/auth/reset-password',
      auth_required: false,
      description: 'Resets password with OTP reset code.',
      sample_body: { reset_code: '123456', new_password: 'NewSecretPassword2026!' }
    },
    {
      name: 'Logout Session',
      method: 'POST',
      path: '/api/auth/logout',
      auth_required: true,
      description: 'Invalidates the active session token.',
      sample_body: null
    },
    {
      name: 'Health & Metrics',
      method: 'GET',
      path: '/api/auth/health',
      auth_required: false,
      description: 'Returns server status and database metrics.',
      sample_body: null
    }
  ];
  res.json({ success: true, endpoints });
});

// --------------------------------------------------
// STATIC FILES & SPA FALLBACK (Frontend React app)
// --------------------------------------------------
let frontendDist = path.join(__dirname, '..', 'Frontend', 'dist');
if (!fs.existsSync(frontendDist)) {
  frontendDist = path.join(__dirname, '..', 'client', 'dist');
}

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR CAUGHT:', err);
  res.status(500).send('SERVER ERROR: ' + err.stack);
});

// Start Server if run directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('app.js') ||
  process.argv[1].includes('server')
);
if (isDirectRun || process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✨ AURA Auth API (Node.js/Express) running on:`);
    console.log(`   👉 Local:   http://localhost:${PORT}`);
    console.log(`   👉 Network: http://127.0.0.1:${PORT}`);
  });
}

export default app;
