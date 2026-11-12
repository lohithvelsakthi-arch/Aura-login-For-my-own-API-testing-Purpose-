import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Canvas from './components/Canvas.jsx';
import SignIn from './components/SignIn.jsx';
import Register from './components/Register.jsx';
import Celebration from './components/Celebration.jsx';
import ClientsTab from './components/ClientsTab.jsx';
import ApiConsole from './components/ApiConsole.jsx';
import Profile from './components/Profile.jsx';
import GoogleModal from './components/GoogleModal.jsx';
import GoogleConfigModal from './components/GoogleConfigModal.jsx';
import ForgotModal from './components/ForgotModal.jsx';
import { playSound } from './utils/audio.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('login');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('glossy_auth_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('glossy_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [isNewUser, setIsNewUser] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('glossy_theme') || 'sapphire');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('glossy_sound') !== 'false');
  const [apiOnline, setApiOnline] = useState(true);

  // Modals
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleConfigModalOpen, setGoogleConfigModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Sync theme to body tag
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('glossy_theme', theme);
  }, [theme]);

  // Sync sound setting
  useEffect(() => {
    localStorage.setItem('glossy_sound', String(soundEnabled));
  }, [soundEnabled]);

  // Check health and verify token
  useEffect(() => {
    fetch('/api/auth/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'healthy') setApiOnline(true);
      })
      .catch(() => setApiOnline(false));

    if (authToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('glossy_auth_user', JSON.stringify(data.user));
          } else {
            // Expired token
            setAuthToken(null);
            setCurrentUser(null);
            localStorage.removeItem('glossy_auth_token');
            localStorage.removeItem('glossy_auth_user');
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleAuthSuccess = (token, user, isNew) => {
    setAuthToken(token);
    setCurrentUser(user);
    setIsNewUser(Boolean(isNew));
    localStorage.setItem('glossy_auth_token', token);
    localStorage.setItem('glossy_auth_user', JSON.stringify(user));
    // Immediately display Celebration Screen with tick sign
    setActiveTab('celebration');
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (e) {}
    }
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('glossy_auth_token');
    localStorage.removeItem('glossy_auth_user');
    setActiveTab('login');
    showToast('Signed out of session', 'info');
  };

  return (
    <div className="app-layout">
      {/* Dynamic Ambient Constellation Canvas & Glowing Orbs */}
      <Canvas />

      {/* Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onChangeTheme={setTheme}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          playSound('click', next);
          showToast(next ? 'Sound effects enabled' : 'Sound effects muted', 'info');
        }}
        isLoggedIn={Boolean(authToken && currentUser)}
        apiOnline={apiOnline}
      />

      {/* Main Glassmorphism Card Deck */}
      <main className="main-wrapper">
        <div className="glass-card-deck">
          {activeTab === 'login' && (
            <SignIn
              onLoginSuccess={handleAuthSuccess}
              onOpenForgot={() => setForgotModalOpen(true)}
              onOpenGoogle={() => setGoogleModalOpen(true)}
              onOpenGoogleConfig={() => setGoogleConfigModalOpen(true)}
              onShowToast={showToast}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'register' && (
            <Register
              onRegisterSuccess={handleAuthSuccess}
              onOpenGoogle={() => setGoogleModalOpen(true)}
              onOpenGoogleConfig={() => setGoogleConfigModalOpen(true)}
              onShowToast={showToast}
              soundEnabled={soundEnabled}
            />
          )}

          {activeTab === 'celebration' && (
            <Celebration
              user={currentUser}
              isNewUser={isNewUser}
              soundEnabled={soundEnabled}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsTab
              soundEnabled={soundEnabled}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'api' && (
            <ApiConsole
              authToken={authToken}
              soundEnabled={soundEnabled}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'profile' && currentUser && (
            <Profile
              user={currentUser}
              authToken={authToken}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                localStorage.setItem('glossy_auth_user', JSON.stringify(updated));
              }}
              onUpdateToken={(newToken) => {
                setAuthToken(newToken);
                localStorage.setItem('glossy_auth_token', newToken);
              }}
              onLogout={handleLogout}
              soundEnabled={soundEnabled}
              onShowToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <GoogleModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onGoogleSuccess={handleAuthSuccess}
        soundEnabled={soundEnabled}
        onShowToast={showToast}
      />

      <GoogleConfigModal
        isOpen={googleConfigModalOpen}
        onClose={() => setGoogleConfigModalOpen(false)}
        soundEnabled={soundEnabled}
        onShowToast={showToast}
      />

      <ForgotModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        soundEnabled={soundEnabled}
        onShowToast={showToast}
      />

      {/* Toast Notification Center */}
      <div className="toast-container" id="toastContainer">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type} active`}>
            <span className="toast-icon">
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '⚠️'}
              {t.type === 'info' && '💎'}
            </span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

