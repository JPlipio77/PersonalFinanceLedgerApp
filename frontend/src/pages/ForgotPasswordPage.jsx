import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>Reset password</h1>

        {submitted ? (
          <>
            <div style={s.banner}>
              If an account with that email exists, we&apos;ve sent a reset link. Check your inbox.
            </div>
            <p style={s.footer}><Link to="/login" style={s.link}>Back to sign in</Link></p>
          </>
        ) : (
          <>
            <p style={s.subtitle}>Enter your email and we&apos;ll send you a reset link.</p>
            {err && <div style={s.bannerErr}>{err}</div>}
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
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p style={s.footer}><Link to="/login" style={s.link}>Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' },
  card: { background: 'var(--color-bg-card)', borderRadius: 'var(--radius)', padding: '2.5rem', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: 420 },
  title: { fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)', textAlign: 'center' },
  subtitle: { color: 'var(--color-text-muted)', marginBottom: '1.25rem', textAlign: 'center', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none' },
  btn: { padding: '0.7rem', borderRadius: 'var(--radius)', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' },
  banner: { padding: '0.75rem 0.9rem', borderRadius: 'var(--radius)', background: '#d1fae5', color: '#065f46', marginBottom: '1rem', fontSize: '0.875rem' },
  bannerErr: { padding: '0.65rem 0.9rem', borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', marginBottom: '1rem', fontSize: '0.875rem' },
  footer: { textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' },
  link: { color: 'var(--color-primary)' },
};
