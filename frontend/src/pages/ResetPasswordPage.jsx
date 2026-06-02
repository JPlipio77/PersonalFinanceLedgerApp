import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

export default function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token');

  const [password, setPassword]         = useState('');
  const [confirm,  setConfirm]          = useState('');
  const [error,    setError]            = useState('');
  const [success,  setSuccess]          = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Invalid Link</h2>
          <p style={styles.text}>This password reset link is missing a token. Please request a new one.</p>
          <button style={styles.button} onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8)  return setError('Password must be at least 8 characters');
    setSubmitting(true);
    try {
      await axiosInstance.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Set New Password</h2>

        {success ? (
          <>
            <p style={{ ...styles.text, color: 'var(--color-success)', marginBottom: '1.25rem' }}>
              Your password has been reset successfully.
            </p>
            <button style={styles.button} onClick={() => navigate('/login')}>Go to Login</button>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <p style={styles.text}>Enter your new password below.</p>
            {error && <p style={styles.errorMsg}>{error}</p>}
            <input
              style={styles.input}
              type="password"
              placeholder="New password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              autoComplete="new-password"
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button style={styles.button} type="submit" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
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
    padding: '1rem',
  },
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius)',
    padding: '2.25rem 2rem',
    boxShadow: 'var(--shadow-md)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
    color: 'var(--color-text)',
  },
  text: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  button: {
    background: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '0.65rem 1rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  errorMsg: {
    color: 'var(--color-danger)',
    fontSize: '0.85rem',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 'var(--radius)',
    padding: '0.5rem 0.75rem',
  },
};
