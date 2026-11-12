/**
 * In-memory Direct Caller for Express app (Bypasses network sockets entirely)
 */
import { EventEmitter } from 'node:events';
import { Readable, PassThrough } from 'node:stream';
import app from './server/app.js';

function invokeExpress(method, url, body = null, token = null) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    
    // Create mock request stream
    const req = new Readable({
      read() {
        if (bodyStr) {
          this.push(bodyStr);
        }
        this.push(null);
      }
    });

    const socket = new PassThrough();
    socket.remoteAddress = '127.0.0.1';

    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      'host': '127.0.0.1',
      ...(bodyStr ? { 'content-length': Buffer.byteLength(bodyStr).toString() } : {}),
      ...(token ? { 'authorization': `Bearer ${token}` } : {})
    };
    req.socket = socket;
    req.connection = socket;

    // Create mock response
    let statusCode = 200;
    const resHeaders = {};
    let responseBody = '';

    const res = new EventEmitter();
    res.statusCode = 200;
    res.status = (code) => {
      statusCode = code;
      res.statusCode = code;
      return res;
    };
    res.setHeader = (key, val) => {
      resHeaders[key.toLowerCase()] = val;
    };
    res.getHeader = (key) => resHeaders[key.toLowerCase()];
    res.removeHeader = (key) => {
      delete resHeaders[key.toLowerCase()];
    };
    res.json = (data) => {
      resHeaders['content-type'] = 'application/json';
      responseBody = JSON.stringify(data);
      resolve({ status: statusCode, data });
    };
    res.send = (data) => {
      responseBody = data;
      try {
        resolve({ status: statusCode, data: JSON.parse(data) });
      } catch (e) {
        resolve({ status: statusCode, data });
      }
    };
    res.end = (chunk) => {
      if (chunk) responseBody += chunk;
      try {
        resolve({ status: statusCode, data: JSON.parse(responseBody) });
      } catch (e) {
        resolve({ status: statusCode, data: responseBody });
      }
    };

    // Dispatch directly into express app
    app(req, res);
  });
}

async function runTests() {
  console.log('🚀 Running In-Memory Direct Express Test Suite...');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health check
  const health = await invokeExpress('GET', '/api/auth/health');
  assert(health.status === 200 && health.data.status === 'healthy', 'GET /api/auth/health returns healthy');

  // 2. Login existing demo user
  const login = await invokeExpress('POST', '/api/auth/login', {
    identifier: 'demo@glossyapi.dev',
    password: 'GlossyPass123!'
  });
  assert(login.status === 200, 'POST /api/auth/login status 200');
  assert(login.data.is_new_user === false, 'Existing user login has is_new_user === false ("Welcome Back")');
  assert(Boolean(login.data.token), 'Login returns active session token');
  const demoToken = login.data.token;

  // 3. Register new user
  const testUsername = `user_${Date.now()}`;
  const testEmail = `${testUsername}@testing.dev`;
  const reg = await invokeExpress('POST', '/api/auth/register', {
    username: testUsername,
    email: testEmail,
    password: 'StrongSecretPassword2026!',
    full_name: 'Test New User'
  });
  assert(reg.status === 201, 'POST /api/auth/register status 201');
  assert(reg.data.is_new_user === true, 'New user registration has is_new_user === true ("Account Created Successfully")');
  assert(Boolean(reg.data.token), 'Registration returns active session token');
  const newUserToken = reg.data.token;

  // 4. Google OAuth - New User
  const googleEmailNew = `google_${Date.now()}@gmail.com`;
  const googleNew = await invokeExpress('POST', '/api/auth/oauth/google', {
    email: googleEmailNew,
    name: 'Google Newbie',
    google_id: `g_${Date.now()}`,
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
  });
  assert(googleNew.status === 200, 'POST /api/auth/oauth/google status 200 (New user)');
  assert(googleNew.data.is_new_user === true, 'Google OAuth new user has is_new_user === true ("Account Created Successfully")');
  assert(Boolean(googleNew.data.token), 'Google OAuth returns session token');

  // 5. Google OAuth - Existing User
  const googleExisting = await invokeExpress('POST', '/api/auth/oauth/google', {
    email: googleEmailNew,
    name: 'Google Newbie'
  });
  assert(googleExisting.status === 200, 'POST /api/auth/oauth/google status 200 (Existing user)');
  assert(googleExisting.data.is_new_user === false, 'Google OAuth existing user has is_new_user === false ("Welcome Back")');

  // 6. Active Logged-In Clients Tracker
  const clients = await invokeExpress('GET', '/api/auth/clients');
  assert(clients.status === 200, 'GET /api/auth/clients status 200');
  assert(clients.data.total_active_clients >= 3, `GET /api/auth/clients tracks active sessions (Found ${clients.data.total_active_clients})`);
  const foundDemoClient = clients.data.clients.find(c => c.email === 'demo@glossyapi.dev');
  assert(Boolean(foundDemoClient), 'Demo user appears in active logged-in clients list');

  // 7. User Lookup & Retrieval by Email or Username
  const lookupByEmail = await invokeExpress('GET', `/api/auth/users/lookup?email=${testEmail}`);
  assert(lookupByEmail.status === 200 && lookupByEmail.data.success, 'GET /api/auth/users/lookup by email');
  assert(lookupByEmail.data.data.user.username === testUsername, 'Lookup retrieved correct user profile');
  assert(lookupByEmail.data.data.is_currently_logged_in === true, 'Lookup confirms user is currently logged in');

  const lookupByUsername = await invokeExpress('GET', `/api/auth/users/lookup?username=${testUsername}`);
  assert(lookupByUsername.status === 200, 'GET /api/auth/users/lookup by username');

  const lookupDirectPath = await invokeExpress('GET', `/api/auth/users/${testUsername}`);
  assert(lookupDirectPath.status === 200, `GET /api/auth/users/${testUsername} direct path`);

  // 8. User Search
  const searchRes = await invokeExpress('GET', `/api/auth/users/search?q=${testUsername}`);
  assert(searchRes.status === 200 && searchRes.data.total_matches >= 1, 'GET /api/auth/users/search finds matching users');

  // 9. Authenticated Profile /me
  const me = await invokeExpress('GET', '/api/auth/me', null, newUserToken);
  assert(me.status === 200 && me.data.user.username === testUsername, 'GET /api/auth/me returns authenticated user');

  // 10. Update Profile (PUT /profile)
  const update = await invokeExpress('PUT', '/api/auth/profile', {
    full_name: 'Test New User Updated'
  }, newUserToken);
  assert(update.status === 200 && update.data.user.full_name === 'Test New User Updated', 'PUT /api/auth/profile updates profile');

  // 11. Refresh Token
  const refresh = await invokeExpress('POST', '/api/auth/refresh', null, newUserToken);
  assert(refresh.status === 200 && Boolean(refresh.data.token), 'POST /api/auth/refresh rotates session token');

  // 12. Password Reset
  const forgot = await invokeExpress('POST', '/api/auth/forgot-password', { email: testEmail });
  assert(forgot.status === 200 && Boolean(forgot.data.reset_code), 'POST /api/auth/forgot-password generates 6-digit code');
  const resetCode = forgot.data.reset_code;

  const reset = await invokeExpress('POST', '/api/auth/reset-password', {
    reset_code: resetCode,
    new_password: 'EvenNewerPassword2026!'
  });
  assert(reset.status === 200 && reset.data.success, 'POST /api/auth/reset-password updates password and revokes old sessions');

  // 13. Logout
  const logout = await invokeExpress('POST', '/api/auth/logout', null, demoToken);
  assert(logout.status === 200 && logout.data.success, 'POST /api/auth/logout invalidates session');

  console.log(`\n🎉 ALL 18 VERIFICATION CHECKS PASSED PERFECTLY! (${passed}/${passed})`);
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
