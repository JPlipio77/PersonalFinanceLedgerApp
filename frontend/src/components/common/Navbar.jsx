import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
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
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </div>
        )}
      </div>
    </nav>
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
};
