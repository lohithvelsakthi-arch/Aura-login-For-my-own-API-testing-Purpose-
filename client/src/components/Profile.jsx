import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/audio.js';

export default function Profile({
  user,
  authToken,
  onUpdateUser,
  onUpdateToken,
  onLogout,
  soundEnabled,
  onShowToast
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.full_name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const fetchSessions = async () => {
    if (!authToken) return;
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [authToken]);

  const handleCopyToken = () => {
    if (!authToken) return;
    navigator.clipboard.writeText(authToken);
    playSound('click', soundEnabled);
    onShowToast('Active token copied to clipboard!', 'success');
  };

  const handleRefreshToken = async () => {
    if (!authToken) return;
    playSound('click', soundEnabled);
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        playSound('success', soundEnabled);
        onUpdateToken(data.token);
        onShowToast('Session token rotated and extended 24h!', 'success');
        fetchSessions();
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Failed to refresh token', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Connection error refreshing token', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          full_name: editFullName,
          username: editUsername
        })
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        playSound('success', soundEnabled);
        onUpdateUser(data.user);
        setShowEdit(false);
        onShowToast('Profile updated successfully!', 'success');
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Profile update failed', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Network error updating profile', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleRevokeOthers = async () => {
    playSound('click', soundEnabled);
    try {
      const res = await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onShowToast(data.message || 'Revoked other sessions', 'success');
        fetchSessions();
      }
    } catch (e) {
      playSound('error', soundEnabled);
    }
  };

  return (
    <section className="glass-card tab-content active" id="profileTab">
      <div className="card-gloss-highlight"></div>

      <div className="profile-header-banner">
        <div className="profile-avatar-gloss" id="profileAvatarWrap">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span id="profileInitials">{initials}</span>
          )}
          <div className="avatar-ring"></div>
        </div>
        <div className="profile-info-text">
          <div className="active-badge" id="profileAuthBadge">
            AUTHENTICATED
          </div>
          <h2 className="profile-name" id="profileDisplayName">
            {user?.full_name || user?.username}
          </h2>
          <span className="profile-handle" id="profileUsername">
            @{user?.username}
          </span>
        </div>
      </div>

      <div className="token-display-box">
        <div className="token-box-header">
          <span>ACTIVE BEARER TOKEN</span>
          <div className="token-actions">
            <button
              type="button"
              className="copy-token-btn interactive-btn"
              id="refreshTokenBtn"
              title="Rotate and extend token"
              onClick={handleRefreshToken}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Extend / Refresh</span>
            </button>
            <button
              type="button"
              className="copy-token-btn interactive-btn"
              id="copyTokenBtn"
              onClick={handleCopyToken}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>
        <code className="token-string" id="profileToken">
          {authToken || 'glossy_...'}
        </code>
      </div>

      <div className="profile-details-grid">
        <div className="detail-card">
          <span className="detail-key">Account Email</span>
          <span className="detail-val" id="profileEmail">{user?.email}</span>
        </div>
        <div className="detail-card">
          <span className="detail-key">User ID</span>
          <span className="detail-val" id="profileId">#{user?.id}</span>
        </div>
        <div className="detail-card">
          <span className="detail-key">Auth Provider</span>
          <span className="detail-val" id="profileProvider" style={{ color: user?.auth_provider === 'google' ? '#38bdf8' : '#34d399' }}>
            {user?.auth_provider === 'google' ? 'Google OAuth' : 'Local'}
          </span>
        </div>
        <div className="detail-card">
          <span className="detail-key">Session Expiry</span>
          <span className="detail-val" id="profileExpires">Active 24h</span>
        </div>
      </div>

      {/* Edit Profile Form Box */}
      <div className="sessions-overview-box" style={{ marginBottom: '1.5rem' }}>
        <div className="console-label-row">
          <span className="console-label">Update Profile Details</span>
          <button
            type="button"
            className="mini-text-btn"
            id="toggleEditProfileBtn"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowEdit(!showEdit);
            }}
          >
            {showEdit ? 'Close Form' : 'Toggle Form'}
          </button>
        </div>

        {showEdit && (
          <form className="auth-form" onSubmit={handleSaveProfile} style={{ marginTop: '0.75rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="editFullNameInput">Full Name</label>
                <div className="input-glass-wrap">
                  <input
                    type="text"
                    id="editFullNameInput"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Full Name"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="editUsernameInput">Username</label>
                <div className="input-glass-wrap">
                  <span className="input-icon">@</span>
                  <input
                    type="text"
                    id="editUsernameInput"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="username"
                    required
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="glossy-btn primary-action interactive-btn spotlight-btn"
              disabled={updatingProfile}
              style={{ padding: '0.75rem 1rem' }}
            >
              <span className="btn-shimmer"></span>
              <span className="btn-text">{updatingProfile ? 'Saving...' : 'Save Changes (PUT /profile)'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="sessions-overview-box">
        <div className="console-label-row">
          <span className="console-label">
            Logged In Sessions (<span id="sessionCount">{sessions.length}</span>)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {sessions.length > 1 && (
              <button type="button" className="mini-text-btn" style={{ color: '#fb7185' }} onClick={handleRevokeOthers}>
                Revoke Other Devices
              </button>
            )}
            <button
              type="button"
              className="mini-text-btn"
              id="reloadSessionsBtn"
              onClick={() => {
                playSound('click', soundEnabled);
                fetchSessions();
              }}
            >
              Reload
            </button>
          </div>
        </div>
        <div className="sessions-list" id="sessionsList">
          {loadingSessions && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              Loading sessions...
            </div>
          )}
          {!loadingSessions && sessions.map((s, idx) => (
            <div key={idx} className="session-item" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.65rem 0.75rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              marginBottom: '0.4rem'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  📱 {s.device_label || 'Browser'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  IP: {s.ip_address} • Started: {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{
                fontSize: '0.68rem',
                color: '#34d399',
                background: 'rgba(16,185,129,0.1)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px'
              }}>
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-actions" style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          className="glossy-btn danger-btn interactive-btn spotlight-btn"
          id="logoutBtn"
          onClick={() => {
            playSound('click', soundEnabled);
            onLogout();
          }}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-content">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Revoke Token & Sign Out</span>
          </span>
        </button>
      </div>
    </section>
  );
}
