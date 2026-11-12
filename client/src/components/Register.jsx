import React, { useState } from 'react';
import { playSound } from '../utils/audio.js';

export default function Register({
  onRegisterSuccess,
  onOpenGoogle,
  onOpenGoogleConfig,
  onShowToast,
  soundEnabled
}) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'Enter password' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    const labels = ['Weak', 'Moderate', 'Strong', 'Ultra Secure'];
    return { score, label: labels[score - 1] || 'Weak' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      playSound('error', soundEnabled);
      onShowToast('Please fill out all required fields.', 'error');
      return;
    }

    if (password.length < 6) {
      playSound('error', soundEnabled);
      onShowToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          full_name: fullName,
          email,
          password
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onShowToast('Account created successfully!', 'success');
        onRegisterSuccess(data.token, data.user, true);
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Registration failed. Check details.', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Failed to connect to registration server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-card tab-content active" id="registerTab">
      <div className="card-gloss-highlight"></div>
      <div className="card-header">
        <div className="pill-badge">NEW IDENTITY</div>
        <h2 className="card-title">Create Account</h2>
        <p className="card-desc">Join the API with an encrypted credential profile or Google.</p>
      </div>

      {/* 1-Click Google Sign Up Button */}
      <button
        type="button"
        className="glossy-btn social-btn google-btn interactive-btn spotlight-btn"
        onClick={() => {
          playSound('click', soundEnabled);
          onOpenGoogle();
        }}
        style={{ width: '100%', marginBottom: '0.75rem' }}
      >
        <span className="btn-shimmer"></span>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
        </svg>
        <span>Sign up with Google (Instant Mode)</span>
      </button>

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
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

      <div className="divider" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
        <span>or register with email</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="regUsername">Username</label>
            <div className="input-glass-wrap">
              <span className="input-icon">@</span>
              <input
                type="text"
                id="regUsername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="neo_matrix"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="regFullName">Full Name</label>
            <div className="input-glass-wrap">
              <input
                type="text"
                id="regFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Thomas Anderson"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="regEmail">Email Address</label>
          <div className="input-glass-wrap">
            <span className="input-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </span>
            <input
              type="email"
              id="regEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="thomas@matrix.dev"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="regPassword">Master Password</label>
          <div className="input-glass-wrap">
            <span className="input-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              id="regPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
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

          {/* Live Password Strength Bar */}
          <div className="strength-meter">
            <div className="strength-segments">
              {[1, 2, 3, 4].map(idx => (
                <div
                  key={idx}
                  className={`seg ${idx <= strength.score ? 'active active-' + strength.score : ''}`}
                />
              ))}
            </div>
            <span className="strength-label">{strength.label}</span>
          </div>
        </div>

        <button
          type="submit"
          className="glossy-btn primary-action interactive-btn spotlight-btn"
          id="regSubmitBtn"
          disabled={loading}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-content">
            <span className="btn-text">{loading ? 'Creating...' : 'Generate Credentials'}</span>
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
    </section>
  );
}
