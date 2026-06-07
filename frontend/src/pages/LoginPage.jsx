import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { login } from '../api/authApi';

export default function LoginPage() {
  const { user, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const oauthError = searchParams.get('error');
  const resetSuccess = searchParams.get('message') === 'password_reset';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setUser(res.data);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Personal Finance Ledger</h1>
        <p style={s.subtitle}>Track your income, expenses, and budgets.</p>

        {resetSuccess && <div style={s.banner}>Password updated — you can sign in now.</div>}
        {oauthError && <div style={{ ...s.banner, ...s.bannerErr }}>Google sign-in failed. Try again.</div>}
        {err && <div style={{ ...s.banner, ...s.bannerErr }}>{err}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <input
            style={s.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            style={s.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div style={s.forgotRow}>
            <Link to="/forgot-password" style={s.link}>Forgot password?</Link>
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={s.divider}><span style={s.dividerText}>or</span></div>

        <button style={s.googleBtn} onClick={handleGoogle} type="button">
          Sign in with Google
        </button>

        <p style={s.footer}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={s.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' },
  card: { background: 'var(--color-bg-card)', borderRadius: 'var(--radius)', padding: '2.5rem', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: 420 },
  title: { fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)', textAlign: 'center' },
  subtitle: { color: 'var(--color-text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none' },
  forgotRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' },
  link: { color: 'var(--color-primary)', fontSize: '0.875rem' },
  btn: { padding: '0.7rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.25rem' },
  googleBtn: { width: '100%', padding: '0.7rem', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' },
  divider: { position: 'relative', textAlign: 'center', margin: '1.25rem 0', borderTop: '1px solid var(--color-border)' },
  dividerText: { position: 'relative', top: '-0.65rem', background: 'var(--color-bg-card)', padding: '0 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' },
  banner: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', background: '#d1fae5', color: '#065f46', marginBottom: '1rem', fontSize: '0.875rem' },
  bannerErr: { background: '#fee2e2', color: '#991b1b' },
  footer: { textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' },
};
