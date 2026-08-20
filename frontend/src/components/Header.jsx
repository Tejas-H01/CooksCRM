import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEventContext } from '../context/EventContext';
import { Search, Bell, Sun, Moon, LogOut } from 'lucide-react';

export const Header = () => {
  const { eventLog, theme, toggleTheme } = useEventContext();
  const location = useLocation();
  const navigate = useNavigate();

  const currentRoute = location.pathname;
  const isAdminView = currentRoute.startsWith('/admin');
  const isRegionalView = currentRoute.startsWith('/regional');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getHeaderTitle = () => {
    if (isAdminView) return "Admin Dashboard - System Control & Overview";
    if (isRegionalView) return "Regional Dashboard - Multi-Branch Oversight & Operational Intelligence";
    if (currentRoute === '/manager') return "Manager Dashboard - Team Performance & Run-Rate";
    return "RM Dashboard - Operational Intelligence & Actions";
  };

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {getHeaderTitle()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-time event processing and operational decision engine
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Quick Search */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem'
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
          <input
            type="text"
            placeholder="Search leads, events..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              width: '150px'
            }}
          />
        </div>

        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-glass-hover)',
            color: 'var(--text-main)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} style={{ color: '#fca004' }} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} style={{ color: '#3ea4f5' }} />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Notification Bell */}
        <div
          style={{
            position: 'relative',
            padding: '0.45rem',
            background: 'var(--input-bg)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <Bell size={18} />
          {eventLog.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-rm)'
              }}
            />
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(241, 82, 111, 0.12)',
            border: '1px solid rgba(241, 82, 111, 0.3)',
            color: 'var(--accent-regional)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title="Sign Out of Session"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
