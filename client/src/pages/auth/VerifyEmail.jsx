import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('No verification token found.'); return; }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch(err => { setStatus('error'); setMsg(err.response?.data?.error || 'Verification failed.'); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #05010f 0%, #0d0820 35%, #060d1f 65%, #030a1a 100%)' }}>
      <div className="w-full max-w-sm text-center">
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'baseline', marginBottom: 32 }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>CELL</span>
          <span style={{ fontSize: 38, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-1px' }}>TECH</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginLeft: 6, letterSpacing: '3px' }}>POS</span>
        </Link>

        <div style={{ background: 'rgba(15,10,35,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 16, padding: 32 }}>
          {status === 'verifying' && (
            <>
              <div style={{ fontSize: 48 }} className="animate-pulse">⏳</div>
              <p style={{ color: '#94a3b8', marginTop: 16 }}>Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div style={{ fontSize: 48 }}>✅</div>
              <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 22, marginTop: 16, marginBottom: 8 }}>Email Verified!</h2>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Your account is fully verified. You're all set.</p>
              <Link to="/app" style={{ display: 'inline-block', marginTop: 24, background: '#2dd4bf', color: '#fff', textDecoration: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
                Go to Dashboard →
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div style={{ fontSize: 48 }}>❌</div>
              <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 22, marginTop: 16, marginBottom: 8 }}>Verification Failed</h2>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>{msg}</p>
              <Link to="/forgot-password" style={{ display: 'inline-block', marginTop: 24, background: 'transparent', color: '#818cf8', textDecoration: 'none', padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14, border: '1px solid rgba(129,140,248,0.4)' }}>
                Request new link →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
