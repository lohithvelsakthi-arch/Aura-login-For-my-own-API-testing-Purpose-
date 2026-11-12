import React, { useState } from 'react';
import { playSound } from '../utils/audio.js';

const ENDPOINTS_CONFIG = {
  google: {
    name: 'Google OAuth Sign-In / Sign-Up',
    method: 'POST',
    path: '/api/auth/oauth/google',
    requiresAuth: false,
    defaultBody: {
      email: 'alex.mercer.dev@gmail.com',
      name: 'Alex Mercer',
      google_id: '10492847291048291048',
      picture: 'https://lh3.googleusercontent.com/a/default-user'
    }
  },
  clients: {
    name: 'List Active Logged-In Clients',
    method: 'GET',
    path: '/api/auth/clients',
    requiresAuth: false,
    defaultBody: null
  },
  lookup: {
    name: 'Lookup User by Email or Username',
    method: 'GET',
    path: '/api/auth/users/lookup?identifier=demo@glossyapi.dev',
    requiresAuth: false,
    defaultBody: null
  },
  search_users: {
    name: 'Search Users Registry',
    method: 'GET',
    path: '/api/auth/users/search?q=demo',
    requiresAuth: false,
    defaultBody: null
  },
  login: {
    name: 'User Login',
    method: 'POST',
    path: '/api/auth/login',
    requiresAuth: false,
    defaultBody: {
      identifier: 'demo@glossyapi.dev',
      password: 'GlossyPass123!',
      remember: true
    }
  },
  register: {
    name: 'Register User',
    method: 'POST',
    path: '/api/auth/register',
    requiresAuth: false,
    defaultBody: {
      username: `coder_${Math.floor(Math.random() * 900 + 100)}`,
      email: `dev${Math.floor(Math.random() * 900 + 100)}@cloud.org`,
      password: 'GlossySecretPassword2026!',
      full_name: 'Dev Tester'
    }
  },
  me: {
    name: 'Get Current Authenticated Profile',
    method: 'GET',
    path: '/api/auth/me',
    requiresAuth: true,
    defaultBody: null
  },
  profile: {
    name: 'Update Profile Details',
    method: 'PUT',
    path: '/api/auth/profile',
    requiresAuth: true,
    defaultBody: {
      full_name: 'Alex Mercer (Updated)',
      avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=Alex'
    }
  },
  change_pw: {
    name: 'Change Password',
    method: 'POST',
    path: '/api/auth/change-password',
    requiresAuth: true,
    defaultBody: {
      current_password: 'GlossyPass123!',
      new_password: 'GlossySecretPassword2026!'
    }
  },
  refresh: {
    name: 'Refresh Session Token',
    method: 'POST',
    path: '/api/auth/refresh',
    requiresAuth: true,
    defaultBody: null
  },
  sessions: {
    name: 'List Active Sessions',
    method: 'GET',
    path: '/api/auth/sessions',
    requiresAuth: true,
    defaultBody: null
  },
  revoke_all: {
    name: 'Revoke Other Active Sessions',
    method: 'POST',
    path: '/api/auth/sessions/revoke-all',
    requiresAuth: true,
    defaultBody: null
  },
  health: {
    name: 'Health & Metrics',
    method: 'GET',
    path: '/api/auth/health',
    requiresAuth: false,
    defaultBody: null
  },
  logout: {
    name: 'Logout Session',
    method: 'POST',
    path: '/api/auth/logout',
    requiresAuth: true,
    defaultBody: null
  }
};

export default function ApiConsole({ authToken, soundEnabled, onShowToast }) {
  const [selectedKey, setSelectedKey] = useState('google');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(ENDPOINTS_CONFIG.google.defaultBody, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState('// Press "Execute Endpoint" to test this API live...');
  const [responseMeta, setResponseMeta] = useState(null);

  const currentEndpoint = ENDPOINTS_CONFIG[selectedKey];

  const handleSelectEndpoint = (key) => {
    setSelectedKey(key);
    const cfg = ENDPOINTS_CONFIG[key];
    setPayloadText(cfg.defaultBody ? JSON.stringify(cfg.defaultBody, null, 2) : '');
    playSound('click', soundEnabled);
  };

  const handleFormatJson = () => {
    try {
      if (!payloadText.trim()) return;
      const parsed = JSON.parse(payloadText);
      setPayloadText(JSON.stringify(parsed, null, 2));
      playSound('click', soundEnabled);
      onShowToast('JSON formatted', 'info');
    } catch (e) {
      playSound('error', soundEnabled);
      onShowToast('Invalid JSON in payload', 'error');
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    playSound('click', soundEnabled);
    const startTime = performance.now();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentEndpoint.requiresAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const options = {
        method: currentEndpoint.method,
        headers
      };

      if (currentEndpoint.method !== 'GET' && payloadText.trim()) {
        options.body = payloadText;
      }

      const res = await fetch(currentEndpoint.path, options);
      const durationMs = Math.round(performance.now() - startTime);

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }

      setResponseMeta({
        status: `${res.status} ${res.statusText || (res.ok ? 'OK' : 'Error')}`,
        isOk: res.ok,
        duration: `${durationMs}ms`
      });

      setResponseOutput(typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data));

      if (res.ok) {
        playSound('success', soundEnabled);
      } else {
        playSound('error', soundEnabled);
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      setResponseMeta({
        status: '500 Network Error',
        isOk: false,
        duration: `${durationMs}ms`
      });
      setResponseOutput(`Network error: ${err.message}`);
      playSound('error', soundEnabled);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCurl = () => {
    const origin = window.location.origin;
    let curl = `curl -X ${currentEndpoint.method} "${origin}${currentEndpoint.path}"`;
    if (currentEndpoint.requiresAuth && authToken) {
      curl += ` \\\n  -H "Authorization: Bearer ${authToken}"`;
    }
    if (currentEndpoint.method !== 'GET' && payloadText.trim()) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '${payloadText.replace(/'/g, "'\\''")}'`;
    }

    navigator.clipboard.writeText(curl);
    playSound('click', soundEnabled);
    onShowToast('cURL snippet copied to clipboard!', 'success');
  };

  return (
    <section className="glass-card tab-content active" id="apiTab">
      <div className="card-gloss-highlight"></div>
      <div className="card-header">
        <div className="pill-badge">DEVELOPER SUITE</div>
        <h2 className="card-title">Live API Tester</h2>
        <p className="card-desc">Execute requests live against the backend endpoints in real-time.</p>
      </div>

      {/* Endpoint Selector */}
      <div className="api-endpoint-selector">
        <label>Select Target Endpoint</label>
        <div className="endpoint-button-row">
          {Object.entries(ENDPOINTS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              className={`endpoint-btn interactive-btn ${selectedKey === key ? 'active' : ''}`}
              onClick={() => handleSelectEndpoint(key)}
            >
              <span className={`method-tag ${cfg.method.toLowerCase()}`}>{cfg.method}</span>
              <span>{cfg.path.split('?')[0].replace('/api/auth', '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Request Body Editor */}
      {currentEndpoint.method !== 'GET' && (
        <div className="api-console-section" id="requestPayloadSection">
          <div className="console-label-row">
            <span className="console-label">Request Payload (JSON)</span>
            <button type="button" className="mini-text-btn" onClick={handleFormatJson}>
              Format JSON
            </button>
          </div>
          <div className="code-editor-glass">
            <textarea
              id="apiPayloadTextarea"
              rows="6"
              spellCheck="false"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Execute API Call Button */}
      <div className="api-actions-row">
        <button
          type="button"
          className="glossy-btn primary-action interactive-btn spotlight-btn"
          id="sendApiRequestBtn"
          onClick={handleExecute}
          disabled={loading}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-content">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span className="btn-text">{loading ? 'Executing...' : 'Execute Endpoint'}</span>
          </span>
        </button>
        <button
          type="button"
          className="glossy-btn secondary-btn interactive-btn"
          id="copyCurlBtn"
          onClick={handleCopyCurl}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-text">Copy cURL</span>
        </button>
      </div>

      {/* Response Viewer */}
      <div className="api-console-section">
        <div className="console-label-row">
          <span className="console-label">API Response Output</span>
          {responseMeta && (
            <div className="response-meta" id="responseMeta" style={{ display: 'flex', gap: '0.5rem' }}>
              <span
                className="status-badge"
                style={{
                  background: responseMeta.isOk ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                  color: responseMeta.isOk ? '#34d399' : '#fb7185',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem'
                }}
              >
                {responseMeta.status}
              </span>
              <span
                className="time-badge"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-sub)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem'
                }}
              >
                {responseMeta.duration}
              </span>
            </div>
          )}
        </div>
        <div className="code-display-glass">
          <pre id="apiResponseViewer">
            <code>{responseOutput}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
