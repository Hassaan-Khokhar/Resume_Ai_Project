import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Sparkles, Loader2 } from 'lucide-react';

export default function Login({ addToast }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authAPI.login(form);
      if (data.access_token) {
        login(data.access_token, data.user);
        addToast('Welcome back!');
      } else {
        throw new Error(data.detail || 'Login failed');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Sparkles size={40} color="#a855f7" />
        </div>
        <h1 style={{ textAlign: 'center' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center' }}>Sign in to your ResumeAI account</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Email</label>
            <input className="input-field" type="email" placeholder="you@example.com" required
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input className="input-field" type="password" placeholder="••••••••" required
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" className="auth-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
