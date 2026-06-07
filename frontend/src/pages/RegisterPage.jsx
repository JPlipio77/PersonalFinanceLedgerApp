import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { register } from '../api/authApi';

const COUNTRIES = [
  'Philippines', 'United States', 'United Kingdom', 'Australia', 'Canada',
  'Singapore', 'Japan', 'South Korea', 'India', 'Germany', 'France',
  'United Arab Emirates', 'Saudi Arabia', 'Malaysia', 'Indonesia', 'Thailand',
  'Vietnam', 'New Zealand', 'Hong Kong', 'Taiwan', 'Other',
];

export default function RegisterPage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', birthday: '', country: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password !== form.confirmPassword) return setErr('Passwords do not match');
    if (form.password.length < 8) return setErr('Password must be at least 8 characters');
    setLoading(true);
    try {
      const res = await register(form);
      setUser(res.data);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Create account</h1>
        <p style={s.subtitle}>Join Personal Finance Ledger</p>

        {err && <div style={s.bannerErr}>{err}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Email address <span style={s.req}>*</span></label>
          <input style={s.input} type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="you@example.com" />

          <label style={s.label}>Password <span style={s.req}>*</span></label>
          <input style={s.input} type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" placeholder="At least 8 characters" />

          <label style={s.label}>Confirm password <span style={s.req}>*</span></label>
          <input style={s.input} type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required autoComplete="new-password" placeholder="Repeat password" />

          <label style={s.label}>Birthday</label>
          <input style={s.input} type="date" value={form.birthday} onChange={set('birthday')} max={new Date().toISOString().split('T')[0]} />

          <label style={s.label}>Country</label>
          <select style={s.input} value={form.country} onChange={set('country')}>
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem' },
  card: { background: 'var(--color-bg-card)', borderRadius: 'var(--radius)', padding: '2.5rem', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: 440 },
  title: { fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)', textAlign: 'center' },
  subtitle: { color: 'var(--color-text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.4rem' },
  req: { color: 'var(--color-danger)' },
  input: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none', width: '100%' },
  btn: { padding: '0.7rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.75rem' },
  bannerErr: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', marginBottom: '1rem', fontSize: '0.875rem' },
  footer: { textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' },
  link: { color: 'var(--color-primary)' },
};
