import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Request failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #05010f 0%, #0d0820 35%, #060d1f 65%, #030a1a 100%)' }}
    >
      <style>{`
        .fp-card { background: rgba(15,10,35,0.72); backdrop-filter: blur(20px); border: 1px solid rgba(167,139,250,0.18); box-shadow: 0 0 60px rgba(139,92,246,0.12), 0 24px 80px rgba(0,0,0,0.6); }
        .fp-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(167,139,250,0.2); color: #e2e8f0; border-radius: 0.5rem; padding: 0.6rem 0.875rem; width: 100%; outline: none; font-size: 0.9rem; transition: border-color 0.2s; }
        .fp-input:focus { border-color: rgba(139,92,246,0.6); box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .fp-label { display: block; font-size: 0.75rem; font-weight: 500; color: #94a3b8; margin-bottom: 0.35rem; letter-spacing: 0.05em; text-transform: uppercase; }
        .fp-btn { width: 100%; padding: 0.65rem 1rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%); color: white; transition: opacity 0.2s; box-shadow: 0 4px 24px rgba(124,58,237,0.4); margin-top: 0.25rem; }
        .fp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>CELL</span>
            <span style={{ fontSize: 38, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-1px' }}>TECH</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginLeft: 6, letterSpacing: '3px' }}>POS</span>
          </Link>
        </div>

        <div className="fp-card rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div style={{ fontSize: 48 }}>📱</div>
              <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 20 }}>Check your phone</h2>
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                If that email is in our system, we sent a password reset link via SMS to the phone number on your account.
              </p>
              <p style={{ color: '#64748b', fontSize: 13 }}>The link expires in 30 minutes.</p>
            </div>
          ) : (
            <>
              <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Reset Password</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                Enter your email and we'll send a reset link to your store's phone number.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="fp-label">Email Address</label>
                  <input
                    type="email"
                    className="fp-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@store.com"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="fp-btn" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center mt-5 text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
