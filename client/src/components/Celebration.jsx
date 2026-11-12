import React from 'react';
import { playSound } from '../utils/audio.js';

export default function Celebration({
  user,
  isNewUser,
  soundEnabled,
  onNavigateTab
}) {
  const isNew = Boolean(isNewUser);
  const fullName = user?.full_name || user?.username || 'User';
  const email = user?.email || '';
  const provider = (user?.auth_provider || 'local').toUpperCase();
  const initials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <section className="glass-card tab-content active" id="statusSuccessScreen">
      <div className="card-gloss-highlight"></div>

      {/* Animated Tick Sign with Liquid Pulse Rings */}
      <div className="success-checkmark-wrapper">
        <div className="checkmark-pulse-ring ring-1"></div>
        <div className="checkmark-pulse-ring ring-2"></div>
        <div className="checkmark-circle-gloss">
          <svg className="checkmark-svg" viewBox="0 0 52 52">
            <circle className="checkmark-circle-bg" cx="26" cy="26" r="23" fill="none" />
            <path className="checkmark-tick" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
      </div>

      <div className="card-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div className="pill-badge" id="successBadge" style={{ margin: '0 auto 0.75rem auto' }}>
          {isNew ? 'NEW ACCOUNT CREATED' : 'SESSION VERIFIED'}
        </div>
        <h2 className="card-title" id="successHeading">
          {isNew ? 'Account Created Successfully' : 'Welcome Back'}
        </h2>
        <p className="card-desc" id="successSubHeading">
          {isNew
            ? `Welcome to AURA, ${fullName}! Your new account has been created and session activated.`
            : `Great to see you again, ${fullName}! Your session credentials have been authenticated.`}
        </p>
      </div>

      {/* Identity Summary Glass Pill */}
      <div className="success-identity-box">
        <div className="identity-row">
          <div className="identity-avatar-mini" id="successAvatarMini">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          <div className="identity-info-mini">
            <span className="identity-name" id="successUserName">{fullName}</span>
            <span className="identity-email" id="successUserEmail">{email}</span>
          </div>
          <span className="identity-provider-pill" id="successProviderPill">
            {provider === 'GOOGLE' ? 'Google OAuth' : 'Verified'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="success-actions-column">
        <button
          type="button"
          className="glossy-btn primary-action interactive-btn spotlight-btn"
          id="proceedToProfileBtn"
          onClick={() => {
            playSound('click', soundEnabled);
            onNavigateTab('profile');
          }}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-content">
            <span className="btn-text">Continue to Profile Dashboard</span>
            <svg className="btn-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>
        </button>

        <button
          type="button"
          className="glossy-btn secondary-btn interactive-btn"
          id="proceedToApiBtn"
          style={{ marginTop: '0.75rem', width: '100%' }}
          onClick={() => {
            playSound('click', soundEnabled);
            onNavigateTab('api');
          }}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-text">Test in Live API Console</span>
        </button>

        <button
          type="button"
          className="glossy-btn secondary-btn interactive-btn"
          style={{ marginTop: '0.5rem', width: '100%', opacity: 0.85 }}
          onClick={() => {
            playSound('click', soundEnabled);
            onNavigateTab('clients');
          }}
        >
          <span className="btn-shimmer"></span>
          <span className="btn-text">View Active Clients Registry</span>
        </button>
      </div>
    </section>
  );
}

