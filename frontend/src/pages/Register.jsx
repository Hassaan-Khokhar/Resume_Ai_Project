import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Sparkles, Loader2 } from 'lucide-react';

export default function Register({ addToast }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authAPI.register(form);
      if (data.access_token) {
        login(data.access_token, data.user);
        addToast('Account created successfully!');
      } else {
        throw new Error(data.detail || 'Registration failed');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const u = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="auth-page">
      <div className="auth-card glass-card" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}><Sparkles size={40} color="#a855f7" /></div>
        <h1 style={{ textAlign: 'center' }}>Create Account</h1>
        <p style={{ textAlign: 'center' }}>Join the AI-powered professional network</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Full Name</label>
              <input className="input-field" required placeholder="Hassaan Ali" value={form.name} onChange={e => u('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Username</label>
              <input className="input-field" required placeholder="hassaan_ali" value={form.username} onChange={e => u('username', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="input-field" type="email" required placeholder="you@example.com" value={form.email} onChange={e => u('email', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input className="input-field" type="password" required minLength={6} placeholder="Minimum 6 characters" value={form.password} onChange={e => u('password', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Account Type</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label className="radio-label"><input type="radio" name="role" value="user" checked={form.role === 'user'} onChange={e => u('role', e.target.value)} /> Candidate</label>
              <label className="radio-label"><input type="radio" name="role" value="company" checked={form.role === 'company'} onChange={e => u('role', e.target.value)} /> Company</label>
            </div>
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
