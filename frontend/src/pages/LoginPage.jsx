import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil',
  'Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Costa Rica','Croatia',
  'Cuba','Cyprus','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt',
  'El Salvador','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece',
  'Guatemala','Honduras','Hong Kong','Hungary','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon',
  'Libya','Lithuania','Luxembourg','Malaysia','Mexico','Moldova','Morocco','Myanmar','Nepal',
  'Netherlands','New Zealand','Nicaragua','Nigeria','North Korea','Norway','Oman','Pakistan',
  'Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania',
  'Russia','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa',
  'South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania',
  'Thailand','Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

export default function LoginPage() {
  const { user, setUser } = useAuth();
  const [tab, setTab]     = useState('login');

  const [loginForm, setLoginForm]   = useState({ email: '', password: '' });
  const [regForm,   setRegForm]     = useState({ email: '', password: '', confirmPassword: '', dateOfBirth: '', country: '' });

  const [showForgot,  setShowForgot]  = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent,  setForgotSent]  = useState(false);

  const [formError,   setFormError]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const switchTab = (t) => { setTab(t); setFormError(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await axiosInstance.post('/auth/login', loginForm);
      setUser(res.data.data);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    if (regForm.password !== regForm.confirmPassword) {
      return setFormError('Passwords do not match');
    }
    if (regForm.password.length < 8) {
      return setFormError('Password must be at least 8 characters');
    }
    setSubmitting(true);
    try {
      const res = await axiosInstance.post('/auth/register', {
        email:       regForm.email,
        password:    regForm.password,
        dateOfBirth: regForm.dateOfBirth || undefined,
        country:     regForm.country     || undefined,
      });
      setUser(res.data.data);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axiosInstance.post('/auth/forgot-password', { email: forgotEmail });
    } catch {
      // Swallow — always show success to prevent email enumeration
    } finally {
      setForgotSent(true);
      setSubmitting(false);
    }
  };

  const openForgot = () => { setForgotEmail(''); setForgotSent(false); setShowForgot(true); };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Personal Finance Ledger</h1>
        <p style={styles.subtitle}>Track your income, expenses, and budgets in one place.</p>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button style={tab === 'login'    ? styles.tabActive : styles.tab} onClick={() => switchTab('login')}>Login</button>
          <button style={tab === 'register' ? styles.tabActive : styles.tab} onClick={() => switchTab('register')}>Create Account</button>
        </div>

        {formError && <p style={styles.errorMsg}>{formError}</p>}

        {/* ── Login tab ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
              autoComplete="email"
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
              autoComplete="current-password"
            />
            <button style={styles.button} type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" style={styles.forgotLink} onClick={openForgot}>
              Forgot Password?
            </button>
          </form>
        )}

        {/* ── Register tab ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address (this will be your username)"
              value={regForm.email}
              onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              required
              autoComplete="email"
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password (min. 8 characters)"
              value={regForm.password}
              onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Confirm password"
              value={regForm.confirmPassword}
              onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
            <label style={styles.fieldLabel}>Birthday</label>
            <input
              style={styles.input}
              type="date"
              value={regForm.dateOfBirth}
              onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
            <select
              style={styles.input}
              value={regForm.country}
              onChange={(e) => setRegForm({ ...regForm, country: e.target.value })}
            >
              <option value="">Select country (optional)</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={styles.button} type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        <div style={styles.divider}><span style={styles.dividerText}>or</span></div>
        <button style={styles.googleButton} onClick={handleGoogleLogin}>
          <svg style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 0 1-7.18-2.52H1.83v2.07A8 8 0 0 0 8.98 17"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31"/>
          </svg>
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
    padding: '1rem',
  },
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius)',
    padding: '2.25rem 2rem',
    boxShadow: 'var(--shadow-md)',
    width: '100%',
    maxWidth: '420px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: '0.35rem',
    color: 'var(--color-text)',
    textAlign: 'center',
  },
  subtitle: {
    color: 'var(--color-text-muted)',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    marginBottom: '1.25rem',
  },
  tab: {
    flex: 1,
    padding: '0.55rem 0',
    border: 'none',
    background: 'var(--color-bg)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  tabActive: {
    flex: 1,
    padding: '0.55rem 0',
    border: 'none',
    background: 'var(--color-primary)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
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
  fieldLabel: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginBottom: '-0.4rem',
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
  forgotLink: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    fontSize: '0.82rem',
    textAlign: 'center',
    padding: '0.1rem',
    textDecoration: 'underline',
  },
  errorMsg: {
    color: 'var(--color-danger)',
    fontSize: '0.85rem',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 'var(--radius)',
    padding: '0.5rem 0.75rem',
    marginBottom: '0.75rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.25rem 0',
    gap: '0.75rem',
    color: 'var(--color-border)',
    borderTop: '1px solid var(--color-border)',
    position: 'relative',
    textAlign: 'center',
  },
  dividerText: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--color-bg-card)',
    padding: '0 0.5rem',
    color: 'var(--color-text-muted)',
    fontSize: '0.8rem',
    top: '-0.6rem',
  },
  googleButton: {
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '0.65rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '0.5rem',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    padding: '1rem',
  },
  modal: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius)',
    padding: '1.75rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: 'var(--shadow-md)',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
    color: 'var(--color-text)',
  },
  modalText: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  cancelBtn: {
    flex: 1,
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '0.65rem 1rem',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
  },
};
