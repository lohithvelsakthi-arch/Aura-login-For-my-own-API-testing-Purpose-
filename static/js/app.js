/**
 * AURA // Glossy Auth API Interactive Engine
 * Handles dynamic button physics, cursor spotlighting, Web Audio synthesis,
 * Google OAuth 2.0 Sign-In / Sign-Up, REST API client, and seamless authentication workflows.
 */

// Global State
const state = {
  activeTab: 'loginTab',
  soundEnabled: true,
  currentUser: null,
  authToken: localStorage.getItem('glossy_auth_token') || null,
  activeEndpoint: 'google',
  theme: localStorage.getItem('glossy_theme') || 'sapphire'
};

// ===================================================================
// 1. SYNTHESIZED WEB AUDIO FEEDBACK (Zero external audio files needed)
// ===================================================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      // Crisp mechanical micro-click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'success') {
      // Classy luxury glass chime (two harmonious tones)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08); // C6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.35);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } else if (type === 'error') {
      // Soft muffled error buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (e) {
    // Audio context silently fails if blocked by browser policy
  }
}

// ===================================================================
// 2. INTERACTIVE BUTTON EFFECTS (Spotlight, Ripples, 3D Tilt)
// ===================================================================
function initInteractiveButtons() {
  // A. Spotlight Cursor Tracking (Dynamic Radial Gradient inside button)
  document.querySelectorAll('.interactive-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--mouse-x', `${x}%`);
      btn.style.setProperty('--mouse-y', `${y}%`);
    });

    // B. Interactive Coordinates-based Liquid Ripple on click
    btn.addEventListener('click', (e) => {
      playSound('click');

      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.classList.add('click-ripple');

      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      const clickX = e.clientX ? e.clientX - rect.left - radius : rect.width / 2 - radius;
      const clickY = e.clientY ? e.clientY - rect.top - radius : rect.height / 2 - radius;

      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${clickX}px`;
      ripple.style.top = `${clickY}px`;

      const existingRipple = btn.querySelector('.click-ripple');
      if (existingRipple) {
        existingRipple.remove();
      }

      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  // C. Subtle 3D Perspective Tilt on Card Hover
  const cards = document.querySelectorAll('.glass-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3; // Max 3deg tilt
      const rotateY = ((x - centerX) / centerX) * 3;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    });
  });
}

// Particle Sparkle Burst for Success Events
function spawnSparkles(originEl) {
  const rect = originEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 24; i++) {
    const sparkle = document.createElement('div');
    sparkle.style.position = 'fixed';
    sparkle.style.left = `${centerX}px`;
    sparkle.style.top = `${centerY}px`;
    sparkle.style.width = `${Math.random() * 8 + 4}px`;
    sparkle.style.height = sparkle.style.width;
    sparkle.style.borderRadius = '50%';
    sparkle.style.pointerEvents = 'none';
    sparkle.style.zIndex = '9999';

    const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#6366f1', '#06b6d4', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.backgroundColor = color;
    sparkle.style.boxShadow = `0 0 10px ${color}`;

    document.body.appendChild(sparkle);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 110 + 40;
    const destX = Math.cos(angle) * velocity;
    const destY = Math.sin(angle) * velocity;

    sparkle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
    ], {
      duration: 750 + Math.random() * 250,
      easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
    }).onfinish = () => sparkle.remove();
  }
}

// ===================================================================
// 3. TOAST NOTIFICATION CENTER
// ===================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✨',
    error: '⚠️',
    info: '💎'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || '💎'}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// ===================================================================
// 4. TAB NAVIGATION
// ===================================================================
function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.tab === tabId);
  });

  document.querySelectorAll('.glass-card.tab-content').forEach(card => {
    card.classList.toggle('active', card.id === tabId);
  });
}

// ===================================================================
// 5. GOOGLE OAUTH 2.0 SIGN-IN & SIGN-UP (REAL WORKING FLOW)
// ===================================================================
function initGoogleAuth() {
  const googleModal = document.getElementById('googleOAuthModal');
  const closeGoogleModalBtn = document.getElementById('closeGoogleModalBtn');
  const customGoogleForm = document.getElementById('customGoogleForm');
  const toggleCustomGoogleBtn = document.getElementById('toggleCustomGoogleBtn');

  // Open Google Modal from any Google Auth button (Login or Register tab)
  document.querySelectorAll('.trigger-google-auth').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      playSound('click');
      googleModal.classList.add('active');
    });
  });

  // Close Google Modal
  closeGoogleModalBtn.addEventListener('click', () => {
    playSound('click');
    googleModal.classList.remove('active');
  });

  // Toggle Custom Account Drawer
  toggleCustomGoogleBtn.addEventListener('click', () => {
    const isHidden = customGoogleForm.style.display === 'none';
    customGoogleForm.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      document.getElementById('customGoogleEmail').focus();
    }
  });

  // Handle Clicking any Pre-set Google Account
  document.querySelectorAll('.google-account-pick').forEach(item => {
    item.addEventListener('click', async () => {
      const email = item.dataset.email;
      const name = item.dataset.name;
      const picture = item.dataset.picture;

      await executeGoogleAuth({ email, name, picture }, item);
    });
  });

  // Handle Submitting Custom Google Account Form
  customGoogleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('customGoogleEmail').value.trim();
    const name = document.getElementById('customGoogleName').value.trim();
    const btn = document.getElementById('submitCustomGoogleBtn');

    if (!email) {
      showToast('Please provide a Google email address', 'error');
      return;
    }

    await executeGoogleAuth({
      email,
      name: name || email.split('@')[0],
      picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`
    }, btn);
  });
}

// Execute Google OAuth Request to Backend API
async function executeGoogleAuth(payload, triggerEl) {
  const googleModal = document.getElementById('googleOAuthModal');
  showToast('Connecting to Google OAuth 2.0...', 'info');

  try {
    const res = await fetch('/api/auth/oauth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      googleModal.classList.remove('active');
      playSound('success');
      spawnSparkles(triggerEl || document.body);
      showToast(data.message, 'success');
      handleAuthSuccess(data.token, data.user, data.expires_at, data.is_new_user === true);
    } else {
      playSound('error');
      showToast(data.error || 'Google authentication failed', 'error');
    }
  } catch (err) {
    playSound('error');
    showToast('Network error contacting Google OAuth API', 'error');
  }
}

// ===================================================================
// 6. PASSWORD STRENGTH METER & PEEK TOGGLE
// ===================================================================
function initPasswordFeatures() {
  document.querySelectorAll('.eye-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        input.type = 'password';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  });

  const regPasswordInput = document.getElementById('regPassword');
  const strengthMeter = document.querySelector('.strength-meter');
  const strengthLabel = document.getElementById('strengthLabel');

  regPasswordInput.addEventListener('input', () => {
    const val = regPasswordInput.value;
    strengthMeter.classList.remove('strength-weak', 'strength-medium', 'strength-strong', 'strength-elite');

    if (!val) {
      strengthLabel.textContent = 'Enter password';
      return;
    }

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) score++;

    if (score === 1) {
      strengthMeter.classList.add('strength-weak');
      strengthLabel.textContent = 'Weak';
    } else if (score === 2) {
      strengthMeter.classList.add('strength-medium');
      strengthLabel.textContent = 'Moderate';
    } else if (score === 3) {
      strengthMeter.classList.add('strength-strong');
      strengthLabel.textContent = 'Strong';
    } else if (score >= 4) {
      strengthMeter.classList.add('strength-elite');
      strengthLabel.textContent = 'Elite';
    }
  });
}

// ===================================================================
// 7. AUTHENTICATION & FORM WORKFLOWS
// ===================================================================
function initAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const fillDemoBtn = document.getElementById('fillDemoBtn');

  // Quick-fill Demo Account
  fillDemoBtn.addEventListener('click', () => {
    const identInput = document.getElementById('loginIdentifier');
    const passInput = document.getElementById('loginPassword');

    identInput.value = 'demo@glossyapi.dev';
    passInput.value = 'GlossyPass123!';

    showToast('Demo credentials pre-filled!', 'info');
    spawnSparkles(fillDemoBtn);
  });

  // Login Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;

    btn.classList.add('loading');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, remember })
      });

      const data = await res.json();
      btn.classList.remove('loading');

      if (data.success) {
        playSound('success');
        spawnSparkles(btn);
        showToast(data.message || 'Authenticated successfully!', 'success');
        handleAuthSuccess(data.token, data.user, data.expires_at, false);
      } else {
        playSound('error');
        showToast(data.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      btn.classList.remove('loading');
      playSound('error');
      showToast('Network error contacting API server', 'error');
    }
  });

  // Register Form Submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('regSubmitBtn');
    const username = document.getElementById('regUsername').value.trim();
    const full_name = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    btn.classList.add('loading');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, full_name, email, password })
      });

      const data = await res.json();
      btn.classList.remove('loading');

      if (data.success) {
        playSound('success');
        spawnSparkles(btn);
        showToast('Identity created & session generated!', 'success');
        handleAuthSuccess(data.token, data.user, data.expires_at, true);
      } else {
        playSound('error');
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      btn.classList.remove('loading');
      playSound('error');
      showToast('Network error during registration', 'error');
    }
  });

  // GitHub Social button
  document.querySelectorAll('.social-btn[data-provider="GitHub"]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('GitHub OAuth provider simulated.', 'info');
      spawnSparkles(btn);
    });
  });
}

// Update UI on successful authentication
function handleAuthSuccess(token, user, expiresAt, isNewUser = null) {
  state.authToken = token;
  state.currentUser = user;
  localStorage.setItem('glossy_auth_token', token);

  // Update Profile Card Data
  document.getElementById('profileDisplayName').textContent = user.full_name || user.username;
  document.getElementById('profileUsername').textContent = `@${user.username}`;
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileId').textContent = `#${user.id}`;
  document.getElementById('profileToken').textContent = token;

  // Auth Provider & Badges
  const isGoogle = user.auth_provider === 'google';
  const badgeEl = document.getElementById('profileAuthBadge');
  const providerEl = document.getElementById('profileProvider');

  if (isGoogle) {
    badgeEl.textContent = 'GOOGLE VERIFIED';
    badgeEl.className = 'active-badge google-badge';
    providerEl.textContent = 'Google OAuth 2.0';
  } else {
    badgeEl.textContent = 'AUTHENTICATED';
    badgeEl.className = 'active-badge';
    providerEl.textContent = 'Local Account';
  }

  // Avatar (Use Google image if available)
  const avatarWrap = document.getElementById('profileAvatarWrap');
  if (user.avatar_url) {
    avatarWrap.innerHTML = `
      <img src="${user.avatar_url}" alt="${user.full_name || user.username}">
      <div class="avatar-ring"></div>
    `;
  } else {
    const initials = (user.full_name || user.username)
      .split(' ')
      .map(p => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    avatarWrap.innerHTML = `
      <span id="profileInitials">${initials}</span>
      <div class="avatar-ring"></div>
    `;
  }

  if (user.created_at) {
    document.getElementById('profileCreated').textContent = new Date(user.created_at).toLocaleDateString();
  }
  if (expiresAt) {
    document.getElementById('profileExpires').textContent = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Load Active Sessions
  loadActiveSessions();

  // Show Profile Tab in Navigation
  const profileNav = document.getElementById('profileTabNav');
  profileNav.classList.remove('hidden');

  // If newly authenticated in this session, present the new Celebratory Screen!
  if (isNewUser !== null) {
    showSuccessCelebration(user, isNewUser);
  } else {
    switchTab('profileTab');
  }
}

// Celebration / Success Screen Handler
function showSuccessCelebration(user, isNewUser) {
  const badgeEl = document.getElementById('successBadge');
  const headingEl = document.getElementById('successHeading');
  const subHeadingEl = document.getElementById('successSubHeading');
  const providerPill = document.getElementById('successProviderPill');
  const nameEl = document.getElementById('successUserName');
  const emailEl = document.getElementById('successUserEmail');
  const avatarMini = document.getElementById('successAvatarMini');

  nameEl.textContent = user.full_name || user.username;
  emailEl.textContent = user.email;

  if (user.avatar_url) {
    avatarMini.innerHTML = `<img src="${user.avatar_url}" alt="Avatar">`;
  } else {
    const initials = (user.full_name || user.username)
      .split(' ')
      .map(p => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    avatarMini.innerHTML = initials;
  }

  if (isNewUser) {
    badgeEl.textContent = "ACCOUNT PROVISIONED";
    headingEl.textContent = "Account Created Successfully";
    subHeadingEl.textContent = `Welcome to AURA, ${user.full_name || user.username}! Your encrypted account has been created.`;
    providerPill.textContent = user.auth_provider === 'google' ? "Google Sign Up" : "New Account";
    providerPill.style.color = "#34d399";
  } else {
    badgeEl.textContent = "AUTHENTICATION SUCCESSFUL";
    headingEl.textContent = "Welcome Back";
    subHeadingEl.textContent = `Great to see you again, ${user.full_name || user.username}! Credentials authenticated.`;
    providerPill.textContent = user.auth_provider === 'google' ? "Google Verified" : "Welcome Back";
    providerPill.style.color = "#38bdf8";
  }

  // Re-trigger animated tick sign
  const checkmarkTick = document.querySelector('.checkmark-tick');
  if (checkmarkTick) {
    checkmarkTick.style.animation = 'none';
    checkmarkTick.offsetHeight; // trigger reflow
    checkmarkTick.style.animation = 'strokeCheckmark 0.65s cubic-bezier(0.65, 0, 0.45, 1) 0.2s forwards';
  }

  // Switch to Celebration Screen
  switchTab('statusSuccessScreen');

  // Audio & Sparkles
  playSound('success');
  const checkmarkWrap = document.querySelector('.success-checkmark-wrapper');
  if (checkmarkWrap) {
    spawnSparkles(checkmarkWrap);
  }
}

// Success Screen Action Buttons
function initSuccessScreen() {
  const proceedProfileBtn = document.getElementById('proceedToProfileBtn');
  const proceedApiBtn = document.getElementById('proceedToApiBtn');

  if (proceedProfileBtn) {
    proceedProfileBtn.addEventListener('click', () => {
      playSound('click');
      switchTab('profileTab');
    });
  }

  if (proceedApiBtn) {
    proceedApiBtn.addEventListener('click', () => {
      playSound('click');
      switchTab('apiTab');
    });
  }
}

// Load Active Sessions for Authenticated User
async function loadActiveSessions() {
  if (!state.authToken) return;
  const listEl = document.getElementById('sessionsList');
  const countEl = document.getElementById('sessionCount');

  try {
    const res = await fetch('/api/auth/sessions', {
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      countEl.textContent = data.total_active_sessions || 1;
      listEl.innerHTML = '';
      (data.sessions || []).forEach(s => {
        const row = document.createElement('div');
        row.className = 'session-row';
        row.innerHTML = `
          <div>
            <div class="session-device">${s.device_label || 'Current Browser'}</div>
            <div class="session-date">${new Date(s.created_at).toLocaleString()}</div>
          </div>
          <span class="status-badge">Active</span>
        `;
        listEl.appendChild(row);
      });
    }
  } catch (e) {}
}

// Log Out Handler & Token Refresh
function initProfileActions() {
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', async () => {
    if (state.authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${state.authToken}` }
        });
      } catch (e) {}
    }

    state.authToken = null;
    state.currentUser = null;
    localStorage.removeItem('glossy_auth_token');

    document.getElementById('profileTabNav').classList.add('hidden');
    playSound('click');
    showToast('Signed out. Session invalidated.', 'info');
    switchTab('loginTab');
  });

  // Copy Active Token Button
  const copyTokenBtn = document.getElementById('copyTokenBtn');
  copyTokenBtn.addEventListener('click', () => {
    if (state.authToken) {
      navigator.clipboard.writeText(state.authToken);
      showToast('Bearer token copied to clipboard!', 'success');
      spawnSparkles(copyTokenBtn);
    }
  });

  // Refresh / Extend Token Button
  const refreshTokenBtn = document.getElementById('refreshTokenBtn');
  refreshTokenBtn.addEventListener('click', async () => {
    if (!state.authToken) return;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        state.authToken = data.token;
        localStorage.setItem('glossy_auth_token', data.token);
        document.getElementById('profileToken').textContent = data.token;
        playSound('success');
        spawnSparkles(refreshTokenBtn);
        showToast('Session rotated and extended for 24h!', 'success');
      } else {
        showToast(data.error || 'Failed to refresh token', 'error');
      }
    } catch (err) {
      showToast('Error refreshing token', 'error');
    }
  });

  document.getElementById('reloadSessionsBtn').addEventListener('click', () => {
    loadActiveSessions();
    showToast('Sessions list reloaded', 'info');
  });

  initEditProfile();
}

function initEditProfile() {
  const toggleBtn = document.getElementById('toggleEditProfileBtn');
  const form = document.getElementById('editProfileForm');
  const nameInput = document.getElementById('editFullNameInput');
  const userInput = document.getElementById('editUsernameInput');

  if (toggleBtn && form) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = form.style.display === 'none';
      form.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && state.currentUser) {
        nameInput.value = state.currentUser.full_name || '';
        userInput.value = state.currentUser.username || '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.authToken) {
        showToast('Please sign in first', 'error');
        return;
      }

      const full_name = nameInput.value.trim();
      const username = userInput.value.trim();

      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.authToken}`
          },
          body: JSON.stringify({ full_name, username })
        });

        const data = await res.json();
        if (data.success && data.user) {
          state.currentUser = data.user;
          document.getElementById('profileDisplayName').textContent = data.user.full_name || data.user.username;
          document.getElementById('profileUsername').textContent = `@${data.user.username}`;
          playSound('success');
          spawnSparkles(form);
          showToast('Profile updated successfully!', 'success');
          form.style.display = 'none';
        } else {
          playSound('error');
          showToast(data.error || data.message || 'Failed to update profile', 'error');
        }
      } catch (err) {
        playSound('error');
        showToast('Network error updating profile', 'error');
      }
    });
  }
}

// ===================================================================
// 8. FORGOT PASSWORD / PIN MODAL
// ===================================================================
function initForgotModal() {
  const modal = document.getElementById('forgotModal');
  const openBtn = document.getElementById('openForgotModalBtn');
  const closeBtn = document.getElementById('closeForgotModalBtn');
  const requestForm = document.getElementById('requestCodeForm');
  const verifyForm = document.getElementById('verifyResetForm');
  let currentResetCode = '';

  openBtn.addEventListener('click', () => {
    playSound('click');
    modal.classList.add('active');
    requestForm.style.display = 'flex';
    verifyForm.style.display = 'none';
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmailInput').value.trim();
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        currentResetCode = data.reset_code;
        playSound('success');
        showToast(`Verification code: ${data.reset_code}`, 'info');
        requestForm.style.display = 'none';
        verifyForm.style.display = 'flex';

        // Auto-fill OTP digits for convenience
        const digits = data.reset_code.split('');
        document.querySelectorAll('.otp-digit').forEach((input, idx) => {
          input.value = digits[idx] || '';
        });
      } else {
        playSound('error');
        showToast(data.error || 'Account not found', 'error');
      }
    } catch (err) {
      showToast('Error generating reset code', 'error');
    }
  });

  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassInput').value;
    let code = '';
    document.querySelectorAll('.otp-digit').forEach(input => code += input.value);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_code: code, new_password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        playSound('success');
        showToast(data.message, 'success');
        modal.classList.remove('active');
      } else {
        playSound('error');
        showToast(data.error || 'Reset failed', 'error');
      }
    } catch (err) {
      showToast('Error resetting password', 'error');
    }
  });
}

// ===================================================================
// 9. INTERACTIVE LIVE API CONSOLE
// ===================================================================
const API_ENDPOINTS = {
  google: {
    method: 'POST',
    path: '/api/auth/oauth/google',
    requiresAuth: false,
    body: {
      email: 'alex.mercer.dev@gmail.com',
      name: 'Alex Mercer',
      google_id: '109283920192839201',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    }
  },
  login: {
    method: 'POST',
    path: '/api/auth/login',
    requiresAuth: false,
    body: {
      identifier: 'demo@glossyapi.dev',
      password: 'GlossyPass123!',
      remember: true
    }
  },
  register: {
    method: 'POST',
    path: '/api/auth/register',
    requiresAuth: false,
    body: {
      username: 'agent_smith',
      full_name: 'Agent Smith',
      email: 'smith@matrix.ai',
      password: 'SentinelCode2026!'
    }
  },
  me: {
    method: 'GET',
    path: '/api/auth/me',
    requiresAuth: true,
    body: null
  },
  profile: {
    method: 'PUT',
    path: '/api/auth/profile',
    requiresAuth: true,
    body: {
      username: 'alex_mercer_pro',
      full_name: 'Alexander Mercer Senior'
    }
  },
  refresh: {
    method: 'POST',
    path: '/api/auth/refresh',
    requiresAuth: true,
    body: null
  },
  sessions: {
    method: 'GET',
    path: '/api/auth/sessions',
    requiresAuth: true,
    body: null
  },
  health: {
    method: 'GET',
    path: '/api/auth/health',
    requiresAuth: false,
    body: null
  },
  logout: {
    method: 'POST',
    path: '/api/auth/logout',
    requiresAuth: true,
    body: null
  }
};

function initApiConsole() {
  const payloadSection = document.getElementById('requestPayloadSection');
  const payloadTextarea = document.getElementById('apiPayloadTextarea');
  const sendBtn = document.getElementById('sendApiRequestBtn');
  const copyCurlBtn = document.getElementById('copyCurlBtn');
  const responseViewer = document.getElementById('apiResponseViewer');
  const responseMeta = document.getElementById('responseMeta');
  const statusBadge = document.getElementById('responseStatusBadge');
  const timeBadge = document.getElementById('responseTimeBadge');
  const formatJsonBtn = document.getElementById('formatJsonBtn');

  function updateConsoleView(endpointKey) {
    state.activeEndpoint = endpointKey;
    const config = API_ENDPOINTS[endpointKey];

    document.querySelectorAll('.endpoint-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.endpoint === endpointKey);
    });

    if (config.body) {
      payloadSection.style.display = 'block';
      payloadTextarea.value = JSON.stringify(config.body, null, 2);
    } else {
      payloadSection.style.display = 'none';
    }

    responseViewer.textContent = `// Ready to send ${config.method} ${config.path}\n// Click "Execute Endpoint" below.`;
    responseMeta.style.display = 'none';
  }

  document.querySelectorAll('.endpoint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateConsoleView(btn.dataset.endpoint);
    });
  });

  formatJsonBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(payloadTextarea.value);
      payloadTextarea.value = JSON.stringify(parsed, null, 2);
      showToast('JSON formatted', 'info');
    } catch (e) {
      showToast('Invalid JSON syntax', 'error');
    }
  });

  sendBtn.addEventListener('click', async () => {
    const config = API_ENDPOINTS[state.activeEndpoint];
    const headers = { 'Content-Type': 'application/json' };

    if (config.requiresAuth) {
      if (!state.authToken) {
        showToast('This endpoint requires authentication. Log in first or provide a token.', 'error');
      } else {
        headers['Authorization'] = `Bearer ${state.authToken}`;
      }
    }

    let body = undefined;
    if (config.method === 'POST' && config.body) {
      try {
        body = payloadTextarea.value;
        JSON.parse(body);
      } catch (err) {
        showToast('JSON parse error in request payload', 'error');
        return;
      }
    }

    responseViewer.textContent = '// Sending request to API...';
    const startTime = performance.now();

    try {
      const res = await fetch(config.path, {
        method: config.method,
        headers,
        body
      });

      const elapsed = Math.round(performance.now() - startTime);
      const data = await res.json();

      responseMeta.style.display = 'flex';
      statusBadge.textContent = `${res.status} ${res.statusText || (res.ok ? 'OK' : 'Error')}`;
      statusBadge.className = `status-badge ${res.ok ? '' : 'error'}`;
      timeBadge.textContent = `${elapsed}ms`;

      responseViewer.textContent = JSON.stringify(data, null, 2);

      if (res.ok) {
        playSound('success');
        spawnSparkles(sendBtn);
      } else {
        playSound('error');
      }
    } catch (err) {
      responseMeta.style.display = 'none';
      responseViewer.textContent = `// Error executing request: ${err.message}`;
      playSound('error');
    }
  });

  copyCurlBtn.addEventListener('click', () => {
    const config = API_ENDPOINTS[state.activeEndpoint];
    const url = `${window.location.origin}${config.path}`;
    let curl = `curl -X ${config.method} "${url}" \\\n  -H "Content-Type: application/json"`;

    if (config.requiresAuth && state.authToken) {
      curl += ` \\\n  -H "Authorization: Bearer ${state.authToken}"`;
    }

    if (config.method === 'POST' && config.body) {
      const cleanBody = payloadTextarea.value.replace(/"/g, '\\"').replace(/\n/g, '');
      curl += ` \\\n  -d "${cleanBody}"`;
    }

    navigator.clipboard.writeText(curl);
    showToast('cURL command copied to clipboard!', 'success');
    spawnSparkles(copyCurlBtn);
  });

  updateConsoleView('google');
}

// ===================================================================
// 10. AMBIENT CONSTELLATION CANVAS
// ===================================================================
function initConstellationCanvas() {
  const canvas = document.getElementById('ambientConstellationCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(width > 600 ? 55 : 25, 60);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 120) * 0.12})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  render();
}

// ===================================================================
// 11. THEME SWITCHER
// ===================================================================
function initThemeSwitcher() {
  document.body.dataset.theme = state.theme;

  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.setTheme === state.theme);
    dot.addEventListener('click', () => {
      const theme = dot.dataset.setTheme;
      state.theme = theme;
      document.body.dataset.theme = theme;
      localStorage.setItem('glossy_theme', theme);

      document.querySelectorAll('.theme-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.setTheme === theme);
      });

      playSound('click');
      showToast(`Accent theme: ${theme.toUpperCase()}`, 'info');
    });
  });
}

// Session rehydration on refresh
async function verifyActiveSession() {
  if (!state.authToken) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        handleAuthSuccess(state.authToken, data.user);
      }
    } else {
      localStorage.removeItem('glossy_auth_token');
      state.authToken = null;
    }
  } catch (e) {}
}

// Sound toggle button in header
function initSoundToggle() {
  const toggleBtn = document.getElementById('soundToggle');
  const onIcon = toggleBtn.querySelector('.sound-on-icon');
  const offIcon = toggleBtn.querySelector('.sound-off-icon');

  toggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    onIcon.style.display = state.soundEnabled ? 'block' : 'none';
    offIcon.style.display = state.soundEnabled ? 'none' : 'block';

    if (state.soundEnabled) {
      playSound('click');
      showToast('Sound effects enabled', 'info');
    } else {
      showToast('Sound effects muted', 'info');
    }
  });
}

// Initialize Everything on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      switchTab(pill.dataset.tab);
    });
  });

  initSoundToggle();
  initThemeSwitcher();
  initInteractiveButtons();
  initConstellationCanvas();
  initPasswordFeatures();
  initAuthForms();
  initGoogleAuth();
  initSuccessScreen();
  initForgotModal();
  initProfileActions();
  initApiConsole();
  verifyActiveSession();
});
