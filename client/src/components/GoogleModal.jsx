import React, { useState } from 'react';
import { playSound } from '../utils/audio.js';

export default function GoogleModal({
  isOpen,
  onClose,
  onGoogleSuccess,
  soundEnabled,
  onShowToast
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const mockAccounts = [
    {
      name: 'Alex Mercer',
      email: 'alex.mercer.dev@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      active: true
    },
    {
      name: 'Sarah Connor',
      email: 'sarah.connor.tech@gmail.com',
      picture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
      active: false
    }
  ];

  const handlePickAccount = async (account) => {
    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          name: account.name,
          picture: account.picture,
          google_id: `g_${Date.now()}`
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onClose();
        onShowToast(data.message || 'Authenticated with Google!', 'success');
        onGoogleSuccess(data.token, data.user, data.is_new_user);
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Google authentication failed', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Connection error during Google OAuth', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customEmail) {
      playSound('error', soundEnabled);
      onShowToast('Please provide an email address.', 'error');
      return;
    }

    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customEmail,
          name: customName || customEmail.split('@')[0],
          google_id: `g_${Date.now()}`,
          picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(customEmail)}`
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onClose();
        onShowToast(data.message || 'Google account verified!', 'success');
        onGoogleSuccess(data.token, data.user, data.is_new_user);
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Google authentication failed', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Failed to connect to authentication API', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-modal-backdrop active" id="googleOAuthModal" onClick={onClose}>
      <div
        className="glass-card modal-card google-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-gloss-highlight"></div>
        <button
          type="button"
          className="modal-close-btn"
          id="closeGoogleModalBtn"
          onClick={() => {
            playSound('click', soundEnabled);
            onClose();
          }}
        >
          &times;
        </button>

        <div className="google-modal-header">
          <svg className="google-logo-svg" viewBox="0 0 24 24" width="38" height="38">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
          </svg>
          <h3 className="google-modal-title">Sign in with Google</h3>
          <p className="google-modal-subtitle">
            Choose an account to continue to <span className="aura-tag">AURA API</span>
          </p>
        </div>

        {/* Account Selection List */}
        <div className="google-accounts-list" id="googleAccountsList">
          {mockAccounts.map((acc, idx) => (
            <div
              key={idx}
              className="google-account-item interactive-btn google-account-pick"
              onClick={() => !loading && handlePickAccount(acc)}
            >
              <div className="google-account-avatar">
                <img src={acc.picture} alt={acc.name} />
              </div>
              <div className="google-account-info">
                <span className="account-name">{acc.name}</span>
                <span className="account-email">{acc.email}</span>
              </div>
              {acc.active && <span className="google-active-pill">Active</span>}
            </div>
          ))}

          {/* Custom Account Option */}
          <div
            className="google-account-item custom-account interactive-btn"
            id="toggleCustomGoogleBtn"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowCustom(!showCustom);
            }}
          >
            <div className="google-account-avatar add-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
                <line x1="19" y1="8" x2="19" y2="14"></line>
                <line x1="22" y1="11" x2="16" y2="11"></line>
              </svg>
            </div>
            <div className="google-account-info">
              <span className="account-name">Use another Google account</span>
              <span className="account-email">Enter any name and Google email address</span>
            </div>
          </div>
        </div>

        {/* Custom Account Input Drawer */}
        {showCustom && (
          <form className="custom-google-form" onSubmit={handleCustomSubmit} style={{ display: 'flex' }}>
            <div className="form-group">
              <label>Google Email Address</label>
              <div className="input-glass-wrap">
                <input
                  type="email"
                  id="customGoogleEmail"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="your.name@gmail.com"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-glass-wrap">
                <input
                  type="text"
                  id="customGoogleName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="glossy-btn primary-action interactive-btn spotlight-btn"
              id="submitCustomGoogleBtn"
              disabled={loading}
            >
              <span className="btn-shimmer"></span>
              <span className="btn-text">{loading ? 'Authenticating...' : 'Authenticate as Google User'}</span>
            </button>
          </form>
        )}

        <div className="google-oauth-footer">
          <p>
            To continue, Google will share your name, email address, language preference, and profile picture with AURA.
          </p>
        </div>
      </div>
    </div>
  );
}
