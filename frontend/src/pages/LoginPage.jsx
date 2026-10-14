import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventContext } from '../context/EventContext';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/api';
import { Zap, Lock, User, Eye, EyeOff, ArrowRight, Sun, Moon } from 'lucide-react';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn, isAuthenticated, currentUser, getRoleDefaultPath } = useAuth();
  const { setActiveRole, theme, toggleTheme, refreshAdminData } = useEventContext();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
      navigate(getRoleDefaultPath(currentUser.role), { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, getRoleDefaultPath]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setErrorMsg('');

    try {
      const { user } = await login(username.trim(), password);
      showToast('🚀 Authentication successful! Redirecting to dashboard...', 'success');

      const roleKey = user.role === 'RM' ? 'rm' : user.role === 'BRANCH_MANAGER' ? 'manager' : user.role === 'REGIONAL_HEAD' ? 'regional' : 'admin';
      setActiveRole(roleKey);
      await refreshAdminData();

      const redirectPath = getRoleDefaultPath(user.role);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Login Error:', err);
      const msg = err.detail || err.message || 'Invalid username or password for this account. Please check credentials.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    }
  };

  const handleQuickFill = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--bg-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '1.5rem',
        backgroundImage: `
          radial-gradient(at 10% 20%, rgba(1, 197, 138, 0.12) 0px, transparent 50%),
          radial-gradient(at 90% 80%, rgba(62, 164, 245, 0.12) 0px, transparent 50%),
          radial-gradient(at 50% 50%, rgba(252, 160, 4, 0.08) 0px, transparent 50%)
        `
      }}
    >
      {/* Top Right Theme Toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass-hover)',
          color: 'var(--text-main)',
          borderRadius: '8px',
          padding: '0.45rem 0.85rem',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        {theme === 'dark' ? <Sun size={16} style={{ color: '#fca004' }} /> : <Moon size={16} style={{ color: '#3ea4f5' }} />}
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      {/* Main Glassmorphic Login Card */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem 2.25rem',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-glass-hover)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent-rm), var(--accent-manager))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              boxShadow: '0 0 20px rgba(1, 197, 138, 0.45)',
              color: '#fff'
            }}
          >
            <Zap size={28} />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            SalesOrbit
          </h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 500 }}>
            Operational Sales Intelligence CRM
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(241, 82, 111, 0.12)',
              border: '1px solid rgba(241, 82, 111, 0.35)',
              borderRadius: '8px',
              padding: '0.75rem 0.85rem',
              color: 'var(--accent-regional)',
              fontSize: '0.82rem',
              fontWeight: 600,
              lineHeight: 1.4
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700 }}>
              Username
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '12px' }} />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-glass-hover)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700 }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '12px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-glass-hover)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Sign In Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-rm), var(--accent-manager))',
              border: 'none',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(1, 197, 138, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoggingIn ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to CRM</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
