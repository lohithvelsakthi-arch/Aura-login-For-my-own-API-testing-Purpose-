import React, { useState } from 'react';
import { playSound } from '../utils/audio.js';

export default function ForgotModal({
  isOpen,
  onClose,
  soundEnabled,
  onShowToast
}) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);

  if (!isOpen) return null;

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email) {
      playSound('error', soundEnabled);
      onShowToast('Please enter your account email.', 'error');
      return;
    }

    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        setGeneratedCode(data.reset_code);
        setStep(2);
        // Pre-fill digits for demo convenience
        if (data.reset_code && data.reset_code.length === 6) {
          setDigits(data.reset_code.split(''));
        }
        onShowToast(`Verification code: ${data.reset_code}`, 'info');
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Failed to request reset code.', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Connection error requesting reset code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, val) => {
    const clean = val.slice(-1);
    const updated = [...digits];
    updated[index] = clean;
    setDigits(updated);

    if (clean && index < 5) {
      const nextInput = document.querySelector(`.otp-digit[data-idx="${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.querySelector(`.otp-digit[data-idx="${index - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleApplyReset = async (e) => {
    e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      playSound('error', soundEnabled);
      onShowToast('Please enter all 6 digits of the code.', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      playSound('error', soundEnabled);
      onShowToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    playSound('click', soundEnabled);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_code: fullCode,
          new_password: newPassword
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playSound('success', soundEnabled);
        onShowToast('Password updated! You can now log in.', 'success');
        onClose();
        setStep(1);
        setDigits(['', '', '', '', '', '']);
        setNewPassword('');
      } else {
        playSound('error', soundEnabled);
        onShowToast(data.error || 'Password reset failed', 'error');
      }
    } catch (err) {
      playSound('error', soundEnabled);
      onShowToast('Connection error resetting password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-modal-backdrop active" id="forgotModal" onClick={onClose}>
      <div
        className="glass-card modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-gloss-highlight"></div>
        <button
          type="button"
          className="modal-close-btn"
          id="closeForgotModalBtn"
          onClick={() => {
            playSound('click', soundEnabled);
            onClose();
          }}
        >
          &times;
        </button>

        <div className="card-header">
          <div className="pill-badge">SECURITY RECOVERY</div>
          <h2 className="card-title">Reset Password</h2>
          <p className="card-desc">
            {step === 1
              ? 'Request a 6-digit verification code to reset your account password.'
              : 'Enter your 6-digit verification code and new password.'}
          </p>
        </div>

        {step === 1 && (
          <form className="auth-form" onSubmit={handleRequestCode}>
            <div className="form-group">
              <label htmlFor="resetEmailInput">Account Email</label>
              <div className="input-glass-wrap">
                <input
                  type="email"
                  id="resetEmailInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@glossyapi.dev"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="glossy-btn primary-action interactive-btn spotlight-btn"
              id="requestCodeBtn"
              disabled={loading}
            >
              <span className="btn-shimmer"></span>
              <span className="btn-text">{loading ? 'Generating...' : 'Generate 6-Digit Code'}</span>
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="auth-form" onSubmit={handleApplyReset} style={{ marginTop: '0.5rem' }}>
            {generatedCode && (
              <div style={{
                textAlign: 'center',
                padding: '0.5rem',
                background: 'rgba(99,102,241,0.12)',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: '#a5b4fc'
              }}>
                🔑 Verification Code Generated: <strong>{generatedCode}</strong>
              </div>
            )}

            <div className="form-group">
              <label>6-Digit Verification Code</label>
              <div className="otp-inputs-row">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    className="otp-digit"
                    data-idx={idx}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassInput">New Password</label>
              <div className="input-glass-wrap">
                <input
                  type="password"
                  id="newPassInput"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="glossy-btn primary-action interactive-btn spotlight-btn"
              id="applyResetBtn"
              disabled={loading}
            >
              <span className="btn-shimmer"></span>
              <span className="btn-text">{loading ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

