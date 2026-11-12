import React, { useState } from 'react';
import { playSound } from '../utils/audio.js';

export default function SignIn({
  onLoginSuccess,
  onOpenForgot,
  onOpenGoogle,
  onOpenGoogleConfig,
  onShowToast,
  soundEnabled
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFillDemo = () => {
    playSound('click', soundEnabled);
    setIdentifier('demo@glossyapi.dev');
    setPassword('GlossyPass123!');
    onShowToast('Filled demo credentials', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      playSound('error', soundEnabled);
      onShowToast('Please enter both identifier and password.', 'error');
      return;
    }

    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, remember })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onShowToast(data.message || 'Authenticated successfully!', 'success');
        onLoginSuccess(data.token, data.user, data.is_new_user);
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Authentication failed. Please check credentials.', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Failed to connect to authentication server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-card tab-content active" id="loginTab">
      <div className="card-gloss-highlight"></div>
      <div className="card-header">
        <div className="pill-badge">SECURE ACCESS</div>
        <h2 className="card-title">Welcome Back</h2>
        <p className="card-desc">Sign in with your credentials to authenticate with the API.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="form-group">
          <label htmlFor="loginIdentifier">Email or Username</label>
          <div className="input-glass-wrap">
            <span className="input-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <input
              type="text"
              id="loginIdentifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="demo@glossyapi.dev"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label htmlFor="loginPassword">Password</label>
            <button
              type="button"
              className="subtle-link-btn"
              onClick={() => {
                playSound('click', soundEnabled);
                onOpenForgot();
              }}
            >
              Forgot?
            </button>
          </div>
          <div className="input-glass-wrap">
            <span className="input-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              id="loginPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <button
              type="button"
              className="eye-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title="Toggle password visibility"
            >
              <svg className="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>

        <div className="form-options">
          <label className="custom-checkbox">
            <input
              type="checkbox"
              id="rememberMe"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="checkmark-gloss"></span>
            <span className="checkbox-label">Keep me authenticated (7 days)</span>
          </label>
        </div>

        <button
          type="submit"
          className="glossy-btn primary-action interactive-btn spotlight-btn"
          id="loginSubmitBtn"
          disabled={loading}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-content">
            <span className="btn-text">{loading ? 'Verifying...' : 'Authenticate & Sign In'}</span>
            {!loading && (
              <svg className="btn-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            )}
          </span>
          {loading && <span className="btn-loader" style={{ display: 'inline-block' }}></span>}
        </button>
      </form>

      {/* Quick Demo Account Filler */}
      <div className="demo-account-box">
        <div className="demo-box-gloss"></div>
        <div className="demo-info">
          <span className="demo-badge">1-CLICK DEMO</span>
          <span className="demo-creds">demo@glossyapi.dev • GlossyPass123!</span>
        </div>
        <button
          type="button"
          className="glossy-btn mini-btn interactive-btn"
          onClick={handleFillDemo}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-text">Quick Fill</span>
        </button>
      </div>

      <div className="divider">
        <span>or sign in with</span>
      </div>

      {/* Social Glossy Buttons */}
      <div className="social-btn-grid">
        <button
          type="button"
          className="glossy-btn social-btn google-btn interactive-btn spotlight-btn"
          onClick={() => {
            playSound('click', soundEnabled);
            onOpenGoogle();
          }}
          title="Sign in instantly with Google"
        >
          <span className="btn-shimmer"></span>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
          </svg>
          <span>Google</span>
        </button>

        <button
          type="button"
          className="glossy-btn social-btn interactive-btn spotlight-btn"
          onClick={() => {
            playSound('click', soundEnabled);
            onShowToast('GitHub OAuth placeholder. Use Google for instant sign-in.', 'info');
          }}
        >
          <span className="btn-shimmer"></span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>GitHub</span>
        </button>
      </div>

      <div className="google-official-wrap" style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          type="button"
          className="mini-text-btn"
          style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}
          onClick={() => {
            playSound('click', soundEnabled);
            onOpenGoogleConfig();
          }}
        >
          ⚙️ Google Client ID Settings
        </button>
      </div>
    </section>
  );
}
