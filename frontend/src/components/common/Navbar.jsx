import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <nav style={styles.nav}>
        <Link to="/" style={styles.brand}>Finance Ledger</Link>
        <div style={styles.right}>
          <button onClick={toggleTheme} style={styles.iconBtn} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && <NotificationBell />}
          {user && (
            <div style={styles.userMenu}>
              {user.avatar && (
                <img src={user.avatar} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
              )}
              <span style={styles.name}>{user.displayName}</span>
              <button
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/switch`;
                }}
                style={styles.logoutBtn}
                title="Sign in with a different Google account"
              >
                Switch Account
              </button>
              <button onClick={() => setShowLogoutModal(true)} style={styles.logoutBtn}>Logout</button>
            </div>
          )}
        </div>
      </nav>

      {showLogoutModal && (
        <div style={styles.overlay} onClick={() => setShowLogoutModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Confirm Logout</h3>
            <p style={styles.modalBody}>Are you sure you want to log out?</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowLogoutModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={logout} style={styles.confirmBtn}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    height: '60px',
    background: 'var(--color-bg-card)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: 'var(--color-primary)',
    textDecoration: 'none',
  },
  right: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '0.375rem',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  userMenu: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  avatar: { width: 32, height: 32, borderRadius: '50%' },
  name: { color: 'var(--color-text)', fontSize: '0.9rem' },
  logoutBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '0.375rem',
    padding: '0.25rem 0.75rem',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.75rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: {
    margin: '0 0 0.5rem',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  modalBody: {
    margin: '0 0 1.5rem',
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '0.375rem',
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
  },
  confirmBtn: {
    background: 'var(--color-danger, #e53e3e)',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
};
