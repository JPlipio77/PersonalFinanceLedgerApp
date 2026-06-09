import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { login } from '../api/authApi';

const EyeIcon = ({ open }) =>
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function LoginPage() {
  const { user, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const res = await login(identifier, password);
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
            type="text"
            placeholder="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
          <div style={s.pwWrapper}>
            <input
              style={s.pwInput}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              style={s.pwToggle}
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          <div style={s.forgotRow}>
            <Link to="/forgot-password" style={s.link}>Forgot password?</Link>
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={s.divider}><span style={s.dividerText}>or</span></div>

        <button style={s.googleBtn} onClick={handleGoogle} type="button">
          <GoogleIcon />
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
  input: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  pwWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  pwInput: { padding: '0.65rem 2.5rem 0.65rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  pwToggle: { position: 'absolute', right: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', padding: '0.2rem' },
  forgotRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' },
  link: { color: 'var(--color-primary)', fontSize: '0.875rem' },
  btn: { padding: '0.7rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.25rem' },
  googleBtn: { width: '100%', padding: '0.7rem', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' },
  divider: { position: 'relative', textAlign: 'center', margin: '1.25rem 0', borderTop: '1px solid var(--color-border)' },
  dividerText: { position: 'relative', top: '-0.65rem', background: 'var(--color-bg-card)', padding: '0 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' },
  banner: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', background: '#d1fae5', color: '#065f46', marginBottom: '1rem', fontSize: '0.875rem' },
  bannerErr: { background: '#fee2e2', color: '#991b1b' },
  footer: { textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' },
};
