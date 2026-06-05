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

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div style={styles.overlay} onClick={() => setShowForgot(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Reset Password</h3>

            {forgotSent ? (
              <>
                <p style={styles.modalText}>
                  If that email address is registered, we&apos;ve sent a password reset link.
                  Please check your inbox (and spam folder).
                </p>
                <button style={styles.button} onClick={() => setShowForgot(false)}>Close</button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <p style={styles.modalText}>
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="Email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowForgot(false)}>Cancel</button>
                  <button type="submit" style={styles.button} disabled={submitting}>
                    {submitting ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
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
