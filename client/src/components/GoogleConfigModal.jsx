import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/audio.js';

export default function GoogleConfigModal({
  isOpen,
  onClose,
  soundEnabled,
  onShowToast
}) {
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/oauth/google/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.client_id) {
            setClientId(data.client_id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/oauth/google/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId.trim() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onShowToast('Google Client ID updated successfully!', 'success');
        onClose();
      } else {
        playSound('error', soundEnabled);
        onShowToast('Failed to update Google Client ID', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Error connecting to configuration API', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-modal-backdrop active" id="googleConfigModal" onClick={onClose}>
      <div
        className="glass-card modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-gloss-highlight"></div>
        <button
          type="button"
          className="modal-close-btn"
          id="closeGoogleConfigModalBtn"
          onClick={() => {
            playSound('click', soundEnabled);
            onClose();
          }}
        >
          &times;
        </button>

        <div className="card-header">
          <div className="pill-badge">GOOGLE OAUTH SETUP</div>
          <h2 className="card-title">Google Client ID</h2>
          <p className="card-desc">
            Configure your Google Cloud OAuth 2.0 Web Client ID for official Google Identity Services.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="googleClientIdInput">OAuth Client ID (from console.cloud.google.com)</label>
            <div className="input-glass-wrap">
              <input
                type="text"
                id="googleClientIdInput"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
              Tip: Leave blank to use instant Interactive Google Sign-Up mode, or enter your Client ID to initialize official Google One-Tap & buttons.
            </span>
          </div>
          <button
            type="submit"
            className="glossy-btn primary-action interactive-btn spotlight-btn"
            id="saveGoogleConfigBtn"
            disabled={loading}
          >
            <span className="btn-shimmer"></span>
            <span className="btn-text">{loading ? 'Saving...' : 'Save & Update Google SDK'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
