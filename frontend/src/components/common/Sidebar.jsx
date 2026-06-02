import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',              label: 'Dashboard',     icon: '📊' },
  { to: '/transactions',  label: 'Transactions',  icon: '📝' },
  { to: '/budgets',       label: 'Budgets',       icon: '💰' },
  { to: '/categories',    label: 'Categories',    icon: '🏷️' },
  { to: '/reports',       label: 'Reports',       icon: '📈' },
  { to: '/settings',      label: 'Settings',      icon: '⚙️' },
];

export default function Sidebar() {
  return (
    <aside style={styles.aside}>
      <nav>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.active : {}),
            })}
          >
            <span style={styles.icon}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

const styles = {
  aside: {
    width: '220px',
    minHeight: 'calc(100vh - 60px)',
    background: 'var(--color-bg-card)',
    borderRight: '1px solid var(--color-border)',
    padding: '1rem 0',
    flexShrink: 0,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 1.25rem',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    borderLeft: '3px solid transparent',
    transition: 'all 0.15s',
  },
  active: {
    color: 'var(--color-primary)',
    borderLeftColor: 'var(--color-primary)',
    background: 'rgba(59,130,246,0.08)',
  },
  icon: { fontSize: '1rem', width: '20px', textAlign: 'center' },
};
