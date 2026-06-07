import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/authApi';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password !== confirmPassword) return setErr('Passwords do not match');
    if (password.length < 8) return setErr('Password must be at least 8 characters');
    setLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      navigate('/login?message=password_reset', { replace: true });
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Reset failed — the link may have expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Set new password</h1>
        <p style={s.subtitle}>Enter your new password below.</p>

        {err && <div style={s.bannerErr}>{err}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <input
            style={s.input}
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <input
            style={s.input}
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' },
  card: { background: 'var(--color-bg-card)', borderRadius: 'var(--radius)', padding: '2.5rem', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: 420 },
  title: { fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)', textAlign: 'center' },
  subtitle: { color: 'var(--color-text-muted)', marginBottom: '1.25rem', textAlign: 'center', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none' },
  btn: { padding: '0.7rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' },
  bannerErr: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', marginBottom: '1rem', fontSize: '0.875rem' },
};
