import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/audio.js';

export default function ClientsTab({ soundEnabled, onShowToast }) {
  const [identifier, setIdentifier] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [allUsersList, setAllUsersList] = useState(null);

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const fetchActiveClients = async () => {
    setClientsLoading(true);
    try {
      const res = await fetch('/api/auth/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveClients();
  }, []);

  const handleLookup = async (targetId) => {
    const idToSearch = (targetId || identifier).trim();
    if (!idToSearch) {
      playSound('error', soundEnabled);
      onShowToast('Please enter an email or username', 'error');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    setAllUsersList(null);
    playSound('click', soundEnabled);

    try {
      const res = await fetch(`/api/auth/users/lookup?identifier=${encodeURIComponent(idToSearch)}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        playSound('success', soundEnabled);
        setLookupResult(data.data);
      } else {
        playSound('error', soundEnabled);
        setLookupError(data.error || `No user found matching '${idToSearch}'.`);
      }
    } catch (err) {
      playSound('error', soundEnabled);
      setLookupError('Failed to communicate with user lookup API.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSearchAll = async () => {
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/users/search');
      const data = await res.json();
      if (data.success && data.users) {
        setAllUsersList(data.users);
      }
    } catch (err) {
      setLookupError('Error fetching users registry.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <section className="glass-card tab-content active" id="clientsTab">
      <div className="card-gloss-highlight"></div>
      <div className="card-header">
        <div className="pill-badge">CLIENT REGISTRY & LOOKUP</div>
        <h2 className="card-title">Clients & User Lookup</h2>
        <p className="card-desc">
          Track active logged-in clients and search/retrieve any registered user by email or username.
        </p>
      </div>

      {/* 1. USER RETRIEVAL / SEARCH SECTION */}
      <div className="sessions-overview-box" style={{ marginBottom: '1.5rem' }}>
        <div className="console-label-row">
          <span className="console-label">Retrieve User Profile</span>
          <span className="detail-key">GET /api/auth/users/lookup</span>
        </div>

        <div className="search-glass-wrap" style={{ marginTop: '0.5rem' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', marginLeft: '0.2rem' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="userLookupInput"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLookup();
              }
            }}
            placeholder="Enter email (e.g. demo@glossyapi.dev) or username (e.g. AlexGlossy)..."
          />
          <button
            type="button"
            className="glossy-btn mini-btn interactive-btn"
            id="btnLookupUser"
            onClick={() => handleLookup()}
          >
            <span className="btn-shimmer"></span>
            <span className="btn-text">Retrieve</span>
          </button>
        </div>

        <div className="quick-tags-row">
          <span className="quick-tags-label">Quick lookup:</span>
          <button
            type="button"
            className="quick-tag-pill quick-lookup-btn"
            onClick={() => {
              setIdentifier('demo@glossyapi.dev');
              handleLookup('demo@glossyapi.dev');
            }}
          >
            demo@glossyapi.dev
          </button>
          <button
            type="button"
            className="quick-tag-pill quick-lookup-btn"
            onClick={() => {
              setIdentifier('AlexGlossy');
              handleLookup('AlexGlossy');
            }}
          >
            AlexGlossy
          </button>
          <button
            type="button"
            className="quick-tag-pill"
            id="btnQuickSearchAll"
            onClick={handleSearchAll}
          >
            View All Users
          </button>
        </div>

        {/* Lookup Results Display */}
        <div id="lookupResultContainer">
          {lookupLoading && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              Searching registry for user...
            </div>
          )}

          {!lookupLoading && lookupError && (
            <div style={{
              textAlign: 'center',
              padding: '1.25rem',
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.25)',
              borderRadius: '12px',
              color: '#fb7185',
              fontSize: '0.88rem'
            }}>
              ⚠️ {lookupError}
            </div>
          )}

          {!lookupLoading && !lookupResult && !allUsersList && !lookupError && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Type an email address or username above and click <strong>Retrieve</strong> to inspect their profile and active login status.
            </div>
          )}

          {!lookupLoading && allUsersList && (
            <div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Found {allUsersList.length} registered user(s):
              </div>
              {allUsersList.map(u => (
                <div
                  key={u.id}
                  className="client-session-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setIdentifier(u.email);
                    handleLookup(u.email);
                  }}
                >
                  <div className="client-session-header">
                    <div className="client-user-badge">
                      {u.full_name || u.username}
                      <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                        (@{u.username})
                      </span>
                    </div>
                    <span className={`live-status-badge ${u.is_logged_in ? 'online' : 'offline'}`} style={{ margin: 0 }}>
                      <span className="status-dot"></span>
                      <span>{u.is_logged_in ? 'Online' : 'Offline'}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                    {u.email} • Click to retrieve full profile & sessions
                  </div>
                </div>
              ))}
            </div>
          )}

          {!lookupLoading && lookupResult && (
            <div className="user-lookup-card">
              <div className="lookup-user-header">
                <div className="lookup-avatar">
                  {lookupResult.user.avatar_url ? (
                    <img
                      src={lookupResult.user.avatar_url}
                      alt={lookupResult.user.username}
                      style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>
                      {(lookupResult.user.full_name || lookupResult.user.username)
                        .split(' ')
                        .map(p => p[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="lookup-meta-name">
                    {lookupResult.user.full_name || lookupResult.user.username}
                  </div>
                  <div className="lookup-meta-handle">
                    @{lookupResult.user.username} • {lookupResult.user.email}
                  </div>
                </div>
                <div className={`live-status-badge ${lookupResult.is_currently_logged_in ? 'online' : 'offline'}`}>
                  <span className="status-dot"></span>
                  <span>
                    {lookupResult.is_currently_logged_in
                      ? `LOGGED IN (${lookupResult.active_sessions?.length || 0})`
                      : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="profile-details-grid" style={{ marginBottom: '1rem' }}>
                <div className="detail-card">
                  <span className="detail-key">Auth Provider</span>
                  <span
                    className="detail-val"
                    style={{ color: lookupResult.user.auth_provider === 'google' ? '#38bdf8' : '#34d399' }}
                  >
                    {lookupResult.user.auth_provider === 'google' ? 'Google OAuth 2.0' : 'Local Account'}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-key">Database User ID</span>
                  <span className="detail-val">#{lookupResult.user.id}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-key">Joined Date</span>
                  <span className="detail-val">
                    {lookupResult.user.created_at ? new Date(lookupResult.user.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-key">Last Login</span>
                  <span className="detail-val">
                    {lookupResult.user.last_login ? new Date(lookupResult.user.last_login).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <div className="console-label" style={{ marginBottom: '0.5rem' }}>
                  Active Client Sessions ({lookupResult.active_sessions?.length || 0})
                </div>
                {lookupResult.active_sessions && lookupResult.active_sessions.length > 0 ? (
                  lookupResult.active_sessions.map((s, idx) => (
                    <div key={idx} className="client-session-item">
                      <div className="client-session-header">
                        <span className="client-user-badge">📱 {s.device_label || 'Browser Client'}</span>
                        <span className="client-ip-badge">IP: {s.ip_address || '127.0.0.1'}</span>
                      </div>
                      <div className="client-time-meta">
                        Started: {new Date(s.created_at).toLocaleString()} • Expires: {new Date(s.expires_at).toLocaleString()}
                      </div>
                      <div className="client-token-row">
                        <code style={{ fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          {s.masked_token}
                        </code>
                        <button
                          type="button"
                          className="copy-token-btn interactive-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(s.token);
                            playSound('click', soundEnabled);
                            onShowToast('Token copied to clipboard!', 'success');
                          }}
                        >
                          Copy Token
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                    No active sessions currently. User is offline.
                  </div>
                )}
              </div>

              {lookupResult.recent_activity && lookupResult.recent_activity.length > 0 && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="console-label" style={{ marginBottom: '0.4rem' }}>
                    Recent Security Audit Log
                  </div>
                  {lookupResult.recent_activity.map((l, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{l.event_type}</span>: {l.description} ({new Date(l.created_at).toLocaleTimeString()})
                    </div>
                  ))}
                </div>
              )}

              <details style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, marginBottom: '0.4rem' }}>View Raw JSON Response</summary>
                <pre style={{
                  background: 'rgba(0,0,0,0.5)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  color: '#67e8f9',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {JSON.stringify({ success: true, data: lookupResult }, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* 2. ACTIVE LOGGED-IN CLIENTS TRACKER */}
      <div className="sessions-overview-box">
        <div className="console-label-row">
          <span className="console-label">
            Logged-In Clients (<span id="activeClientsBadgeCount">{clients.length}</span>)
          </span>
          <button
            type="button"
            className="mini-text-btn"
            id="refreshClientsBtn"
            onClick={() => {
              playSound('click', soundEnabled);
              fetchActiveClients();
              onShowToast('Active clients list refreshed', 'info');
            }}
          >
            🔄 Refresh List
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
          Real-time registry of all clients currently connected with active sessions across the API.
        </p>

        <div className="clients-list-container" id="activeClientsContainer">
          {clientsLoading && (
            <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Loading active clients...
            </div>
          )}

          {!clientsLoading && clients.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No clients currently logged in. Sign in using Google or email above to initiate an active session.
            </div>
          )}

          {!clientsLoading && clients.map((c, idx) => {
            const initials = (c.full_name || c.username)
              .split(' ')
              .map(p => p[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div key={idx} className="client-session-item">
                <div className="client-session-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div className="lookup-avatar" style={{ width: '36px', height: '36px', fontSize: '0.9rem', borderRadius: '10px' }}>
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={c.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div>
                      <div className="client-user-badge">
                        {c.full_name || c.username}
                        <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                          (@{c.username})
                        </span>
                        <span
                          className={`active-badge ${c.auth_provider === 'google' ? 'google-badge' : ''}`}
                          style={{ margin: '0 0 0 0.4rem', fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}
                        >
                          {c.auth_provider === 'google' ? 'Google' : 'Local'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>{c.email}</div>
                    </div>
                  </div>
                  <span className="client-ip-badge">IP: {c.ip_address || '127.0.0.1'}</span>
                </div>

                <div className="client-time-meta" style={{ marginTop: '0.4rem' }}>
                  <span>📱 {c.device_label || 'Web Client'}</span> • 
                  <span>Connected: {new Date(c.session_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> • 
                  <span>Expires: {new Date(c.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="client-token-row">
                  <code style={{ fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {c.masked_token}
                  </code>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="copy-token-btn interactive-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(c.token);
                        playSound('click', soundEnabled);
                        onShowToast('Token copied to clipboard!', 'success');
                      }}
                    >
                      Copy Token
                    </button>
                    <button
                      type="button"
                      className="copy-token-btn interactive-btn"
                      style={{ color: '#a5b4fc' }}
                      onClick={() => {
                        setIdentifier(c.email);
                        handleLookup(c.email);
                      }}
                    >
                      Inspect User
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

