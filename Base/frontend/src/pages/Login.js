import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/labs');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon} />
          <span style={styles.logoText}>DevLab</span>
        </div>
        <h1 style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p style={styles.subtitle}>
          {mode === 'login' ? 'Log in to access your labs' : 'Sign up to start building'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div style={styles.switchRow}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button style={styles.switchBtn} onClick={() => setMode('register')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button style={styles.switchBtn} onClick={() => setMode('login')}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1117',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  card: {
    width: '380px',
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '12px',
    padding: '32px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
  logoIcon: { width: '28px', height: '28px', backgroundColor: '#238636', borderRadius: '6px' },
  logoText: { fontSize: '18px', fontWeight: 600, color: '#f0f6fc' },
  title: { fontSize: '22px', fontWeight: 600, color: '#f0f6fc', margin: '0 0 4px' },
  subtitle: { fontSize: '13px', color: '#7d8590', margin: '0 0 24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#7d8590', fontWeight: 600 },
  input: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#e6edf3',
    fontSize: '14px',
    outline: 'none',
  },
  error: {
    backgroundColor: '#3d1418',
    border: '1px solid #f85149',
    color: '#ffa198',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
  },
  submitBtn: {
    backgroundColor: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
  switchRow: { marginTop: '20px', fontSize: '13px', color: '#7d8590', textAlign: 'center' },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#58a6ff',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
  },
};

export default Login;
