import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const floatingElements = [
  // Credit cards
  { id: 1, type: 'card', x: 8, y: 15, size: 52, delay: 0, duration: 18 },
  { id: 2, type: 'card', x: 78, y: 60, size: 44, delay: 3, duration: 22 },
  { id: 3, type: 'card', x: 88, y: 10, size: 36, delay: 7, duration: 16 },
  // Phones
  { id: 4, type: 'phone', x: 5, y: 65, size: 40, delay: 2, duration: 20 },
  { id: 5, type: 'phone', x: 82, y: 35, size: 48, delay: 5, duration: 24 },
  { id: 6, type: 'phone', x: 50, y: 8, size: 32, delay: 9, duration: 19 },
  // Signal / wifi
  { id: 7, type: 'signal', x: 20, y: 80, size: 38, delay: 1, duration: 17 },
  { id: 8, type: 'signal', x: 70, y: 85, size: 30, delay: 6, duration: 21 },
  // Dollar / receipt
  { id: 9, type: 'receipt', x: 35, y: 72, size: 42, delay: 4, duration: 23 },
  { id: 10, type: 'receipt', x: 60, y: 20, size: 34, delay: 8, duration: 15 },
  // Chip / circuit
  { id: 11, type: 'chip', x: 15, y: 42, size: 46, delay: 3.5, duration: 25 },
  { id: 12, type: 'chip', x: 92, y: 72, size: 28, delay: 7.5, duration: 18 },
];

function FloatIcon({ el }) {
  const style = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: el.size,
    height: el.size,
    opacity: 0.07,
    animation: `floatUp ${el.duration}s ${el.delay}s ease-in-out infinite alternate`,
    filter: 'blur(0.5px)',
  };

  if (el.type === 'card') return (
    <svg style={style} viewBox="0 0 56 36" fill="none">
      <rect x="1" y="1" width="54" height="34" rx="5" stroke="#a78bfa" strokeWidth="2" fill="none"/>
      <rect x="1" y="10" width="54" height="8" fill="#a78bfa" opacity="0.3"/>
      <rect x="8" y="23" width="16" height="5" rx="2" fill="#67e8f9" opacity="0.5"/>
      <rect x="30" y="23" width="18" height="2" rx="1" fill="#a78bfa" opacity="0.4"/>
      <rect x="30" y="27" width="12" height="2" rx="1" fill="#a78bfa" opacity="0.3"/>
    </svg>
  );

  if (el.type === 'phone') return (
    <svg style={style} viewBox="0 0 32 52" fill="none">
      <rect x="1" y="1" width="30" height="50" rx="6" stroke="#818cf8" strokeWidth="2" fill="none"/>
      <rect x="10" y="4" width="12" height="2" rx="1" fill="#818cf8" opacity="0.5"/>
      <rect x="12" y="46" width="8" height="3" rx="1.5" fill="#818cf8" opacity="0.4"/>
      <rect x="4" y="10" width="24" height="30" rx="2" fill="#818cf8" opacity="0.08"/>
    </svg>
  );

  if (el.type === 'signal') return (
    <svg style={style} viewBox="0 0 40 40" fill="none">
      <path d="M4 36 Q20 4 36 36" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M10 36 Q20 12 30 36" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M16 36 Q20 20 24 36" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8"/>
      <circle cx="20" cy="36" r="2.5" fill="#22d3ee"/>
    </svg>
  );

  if (el.type === 'receipt') return (
    <svg style={style} viewBox="0 0 36 48" fill="none">
      <path d="M2 2 L34 2 L34 44 L30 40 L26 44 L22 40 L18 44 L14 40 L10 44 L6 40 L2 44 Z" stroke="#c084fc" strokeWidth="2" fill="none"/>
      <line x1="8" y1="12" x2="28" y2="12" stroke="#c084fc" strokeWidth="1.5" opacity="0.6"/>
      <line x1="8" y1="18" x2="28" y2="18" stroke="#c084fc" strokeWidth="1.5" opacity="0.5"/>
      <line x1="8" y1="24" x2="20" y2="24" stroke="#c084fc" strokeWidth="1.5" opacity="0.4"/>
      <line x1="8" y1="30" x2="24" y2="30" stroke="#c084fc" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  );

  if (el.type === 'chip') return (
    <svg style={style} viewBox="0 0 44 44" fill="none">
      <rect x="12" y="12" width="20" height="20" rx="3" stroke="#34d399" strokeWidth="2" fill="none"/>
      <line x1="18" y1="12" x2="18" y2="6" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="26" y1="12" x2="26" y2="6" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="18" y1="32" x2="18" y2="38" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="26" y1="32" x2="26" y2="38" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="12" y1="18" x2="6" y2="18" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="12" y1="26" x2="6" y2="26" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="32" y1="18" x2="38" y2="18" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <line x1="32" y1="26" x2="38" y2="26" stroke="#34d399" strokeWidth="1.5" opacity="0.7"/>
      <rect x="17" y="17" width="10" height="10" rx="1" fill="#34d399" opacity="0.2"/>
    </svg>
  );

  return null;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.token, data.user, data.plan, data.refreshToken);
      navigate(data.user.role === 'superadmin' ? '/superadmin' : '/app');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0px) rotate(-3deg) scale(1); }
          100% { transform: translateY(-28px) rotate(3deg) scale(1.06); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.07; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.32; transform: scale(1.08); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(2000px); opacity: 0; }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -60; }
        }
        .login-card {
          background: rgba(15, 10, 35, 0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(167, 139, 250, 0.18);
          box-shadow: 0 0 60px rgba(139, 92, 246, 0.12), 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .login-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(167,139,250,0.2);
          color: #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.6rem 0.875rem;
          width: 100%;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-size: 0.9rem;
        }
        .login-input::placeholder { color: rgba(148,163,184,0.5); }
        .login-input:focus {
          border-color: rgba(139,92,246,0.6);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
        }
        .login-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 0.35rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .login-btn {
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%);
          color: white;
          letter-spacing: 0.04em;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(124,58,237,0.4);
          margin-top: 0.25rem;
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 30px rgba(124,58,237,0.5);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .circuit-line {
          stroke-dasharray: 12 8;
          animation: dashFlow 2.5s linear infinite;
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #05010f 0%, #0d0820 35%, #060d1f 65%, #030a1a 100%)' }}
      >
        {/* Grid background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ animation: 'gridPulse 6s ease-in-out infinite' }}
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7c3aed" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>

        {/* Circuit traces */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.06 }}>
          <line x1="0" y1="30%" x2="30%" y2="30%" stroke="#22d3ee" strokeWidth="1" className="circuit-line"/>
          <line x1="30%" y1="30%" x2="30%" y2="60%" stroke="#22d3ee" strokeWidth="1" className="circuit-line"/>
          <line x1="30%" y1="60%" x2="60%" y2="60%" stroke="#22d3ee" strokeWidth="1" className="circuit-line"/>
          <line x1="70%" y1="20%" x2="100%" y2="20%" stroke="#a78bfa" strokeWidth="1" className="circuit-line"/>
          <line x1="70%" y1="20%" x2="70%" y2="80%" stroke="#a78bfa" strokeWidth="1" className="circuit-line"/>
          <line x1="15%" y1="75%" x2="15%" y2="95%" stroke="#34d399" strokeWidth="1" className="circuit-line"/>
          <line x1="15%" y1="75%" x2="45%" y2="75%" stroke="#34d399" strokeWidth="1" className="circuit-line"/>
          <circle cx="30%" cy="30%" r="3" fill="#22d3ee" opacity="0.6"/>
          <circle cx="30%" cy="60%" r="3" fill="#22d3ee" opacity="0.6"/>
          <circle cx="60%" cy="60%" r="3" fill="#22d3ee" opacity="0.6"/>
          <circle cx="70%" cy="20%" r="3" fill="#a78bfa" opacity="0.6"/>
          <circle cx="70%" cy="80%" r="3" fill="#a78bfa" opacity="0.6"/>
          <circle cx="15%" cy="75%" r="3" fill="#34d399" opacity="0.6"/>
          <circle cx="45%" cy="75%" r="3" fill="#34d399" opacity="0.6"/>
        </svg>

        {/* Ambient glows */}
        <div className="absolute pointer-events-none" style={{
          left: '15%', top: '20%', width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          animation: 'glowPulse 7s ease-in-out infinite',
          borderRadius: '50%',
        }}/>
        <div className="absolute pointer-events-none" style={{
          right: '10%', bottom: '20%', width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%)',
          animation: 'glowPulse 9s 2s ease-in-out infinite',
          borderRadius: '50%',
        }}/>
        <div className="absolute pointer-events-none" style={{
          left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
          borderRadius: '50%',
        }}/>

        {/* Scan line */}
        <div className="absolute inset-x-0 pointer-events-none" style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(34,211,238,0.5), rgba(139,92,246,0.4), transparent)',
          animation: 'scanLine 8s linear infinite',
          top: 0,
        }}/>

        {/* Floating icons */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floatingElements.map(el => <FloatIcon key={el.id} el={el} />)}
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm relative z-10">
          <div className="flex flex-col items-center mb-8">
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 0 }}>
              <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>CELL</span>
              <span style={{ fontSize: 38, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-1px', lineHeight: 1 }}>TECH</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginLeft: 6, letterSpacing: '3px', lineHeight: 1 }}>POS</span>
            </Link>
            <p className="mt-3 text-sm" style={{ color: 'rgba(148,163,184,0.7)', letterSpacing: '0.06em' }}>
              Repair &amp; Wireless Retail Management
            </p>
          </div>

          <div className="login-card rounded-2xl p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="login-label">Email</label>
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@store.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <div className="text-center mt-4">
              <Link to="/forgot-password" style={{ color: 'rgba(148,163,184,0.55)', fontSize: 13 }}>
                Forgot your password?
              </Link>
            </div>
          </div>

          <p className="text-center mt-5 text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#818cf8', fontWeight: 600 }}>Start your free trial →</Link>
          </p>
          <p className="text-center mt-3 text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>
            © 2026 CellTechPOS · All rights reserved
          </p>
        </div>
      </div>
    </>
  );
}
