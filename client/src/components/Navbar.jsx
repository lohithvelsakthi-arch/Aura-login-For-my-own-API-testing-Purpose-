import React from 'react';
import { playSound } from '../utils/audio.js';

export default function Navbar({
  activeTab,
  onSelectTab,
  theme,
  onChangeTheme,
  soundEnabled,
  onToggleSound,
  isLoggedIn,
  apiOnline
}) {
  const themes = [
    { id: 'sapphire', title: 'Sapphire Indigo' },
    { id: 'emerald', title: 'Emerald Mint' },
    { id: 'rose', title: 'Sunset Rose' },
    { id: 'amber', title: 'Electric Amber' }
  ];

  return (
    <>
      <header className="glass-header">
        {/* Brand Identity */}
        <div
          className="brand-group"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            playSound('click', soundEnabled);
            onSelectTab(isLoggedIn ? 'profile' : 'login');
          }}
        >
          <div className="brand-logo-gem">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
              <line x1="12" y1="22" x2="12" y2="15.5"></line>
              <polyline points="22 8.5 12 15.5 2 8.5"></polyline>
              <polyline points="2 15.5 12 8.5 22 15.5"></polyline>
              <line x1="12" y1="2" x2="12" y2="8.5"></line>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">AURA</span>
            <span className="brand-subtitle">GLOSSY AUTH API</span>
          </div>
        </div>

        {/* Live Status Pill, Theme Accent Switcher & Audio Toggle */}
        <div className="header-actions">
          {/* Theme Switcher Dots */}
          <div className="theme-switcher-glass" title="Change Glass Accent Theme">
            {themes.map(t => (
              <button
                key={t.id}
                className={`theme-dot ${theme === t.id ? 'active' : ''}`}
                onClick={() => {
                  playSound('click', soundEnabled);
                  onChangeTheme(t.id);
                }}
                title={t.title}
                data-set-theme={t.id}
              />
            ))}
          </div>

          <div className="api-status-pill" id="apiStatusPill" title="API Status">
            <span
              className="status-dot"
              style={{ background: apiOnline ? '#10b981' : '#f43f5e' }}
            ></span>
            <span className="status-label">{apiOnline ? 'API Online' : 'Connecting...'}</span>
          </div>

          <button
            className="icon-gloss-btn sound-toggle"
            id="soundToggle"
            title="Toggle Sound Feedback"
            onClick={onToggleSound}
          >
            {soundEnabled ? (
              <svg className="sound-on-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            ) : (
              <svg className="sound-off-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Segmented Navigation Pills */}
      <nav className="nav-segment-container">
        <div className="nav-segment-track">
          <button
            className={`nav-pill interactive-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              playSound('click', soundEnabled);
              onSelectTab('login');
            }}
          >
            <span className="pill-icon">💎</span>
            <span>Sign In</span>
          </button>

          <button
            className={`nav-pill interactive-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              playSound('click', soundEnabled);
              onSelectTab('register');
            }}
          >
            <span className="pill-icon">✨</span>
            <span>Register</span>
          </button>

          <button
            className={`nav-pill interactive-btn ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => {
              playSound('click', soundEnabled);
              onSelectTab('clients');
            }}
          >
            <span className="pill-icon">👥</span>
            <span>Clients & Users</span>
          </button>

          <button
            className={`nav-pill interactive-btn ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => {
              playSound('click', soundEnabled);
              onSelectTab('api');
            }}
          >
            <span className="pill-icon">⚡</span>
            <span>API Console</span>
          </button>

          {isLoggedIn && (
            <button
              className={`nav-pill interactive-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                playSound('click', soundEnabled);
                onSelectTab('profile');
              }}
            >
              <span className="pill-icon">👤</span>
              <span>Profile</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

