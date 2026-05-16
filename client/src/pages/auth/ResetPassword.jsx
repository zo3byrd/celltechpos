import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#05010f' }}>
        <div style={{ color: '#94a3b8', textAlign: 'center' }}>
          <p>Invalid reset link.</p>
          <Link to="/forgot-password" style={{ color: '#818cf8' }}>Request a new one →</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #05010f 0%, #0d0820 35%, #060d1f 65%, #030a1a 100%)' }}
    >
      <style>{`
        .rp-card { background: rgba(15,10,35,0.72); backdrop-filter: blur(20px); border: 1px solid rgba(167,139,250,0.18); box-shadow: 0 0 60px rgba(139,92,246,0.12), 0 24px 80px rgba(0,0,0,0.6); }
        .rp-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(167,139,250,0.2); color: #e2e8f0; border-radius: 0.5rem; padding: 0.6rem 0.875rem; width: 100%; outline: none; font-size: 0.9rem; transition: border-color 0.2s; }
        .rp-input:focus { border-color: rgba(139,92,246,0.6); box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .rp-label { display: block; font-size: 0.75rem; font-weight: 500; color: #94a3b8; margin-bottom: 0.35rem; letter-spacing: 0.05em; text-transform: uppercase; }
        .rp-btn { width: 100%; padding: 0.65rem 1rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%); color: white; transition: opacity 0.2s; box-shadow: 0 4px 24px rgba(124,58,237,0.4); margin-top: 0.25rem; }
        .rp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>CELL</span>
            <span style={{ fontSize: 38, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-1px' }}>TECH</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginLeft: 6, letterSpacing: '3px' }}>POS</span>
          </Link>
        </div>

        <div className="rp-card rounded-2xl p-8">
          <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 20, marginBottom: 20 }}>Set New Password</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="rp-label">New Password</label>
              <input type="password" className="rp-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required autoFocus />
            </div>
            <div>
              <label className="rp-label">Confirm Password</label>
              <input type="password" className="rp-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            <button type="submit" className="rp-btn" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
