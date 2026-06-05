import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user } = useAuth();

  if (user) return <Navigate to="/" replace />;

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Personal Finance Ledger</h1>
        <p style={styles.subtitle}>Track your income, expenses, and budgets in one place.</p>
        <button style={styles.button} onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg)',
  },
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius)',
    padding: '2.5rem',
    boxShadow: 'var(--shadow-md)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    color: 'var(--color-text)',
  },
  subtitle: {
    color: 'var(--color-text-muted)',
    marginBottom: '2rem',
  },
  button: {
    background: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
};
