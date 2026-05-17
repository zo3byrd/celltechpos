import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const PERKS = [
  '30 days free — no credit card required',
  'Repairs, POS, Inventory & more',
  'Unlimited staff accounts',
  'SMS & email notifications',
  'Cancel anytime',
];

export default function Signup() {
  const [form, setForm] = useState({
    storeName: '', name: '', email: '', password: '', confirm: '',
    phone: '', city: '', state: '',
  });
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const { setAuth, resetOnboarding } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const body = {
        storeName: form.storeName,
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
      };
      body.password = form.password;
      if (referralCode) body.referralCode = referralCode;

      const { data } = await api.post('/auth/signup', body);
      setAuth(data.token, data.user, data.plan || 'trial', data.refreshToken);
      resetOnboarding();
      window.location.href = '/app/onboarding';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) rotate(-3deg) scale(1); }
          100% { transform: translateY(-28px) rotate(3deg) scale(1.06); }
        }
        @keyframes gridPulse {
          0%,100% { opacity: 0.03; }
          50%      { opacity: 0.07; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.18; transform: scale(1); }
          50%     { opacity: 0.32; transform: scale(1.08); }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity:0; }
          10%  { opacity:1; }
          90%  { opacity:1; }
          100% { transform: translateY(2000px); opacity:0; }
        }
        @keyframes dashFlow { to { stroke-dashoffset:-60; } }
        .su-card {
          background: rgba(15,10,35,0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(167,139,250,0.18);
          box-shadow: 0 0 60px rgba(139,92,246,0.12), 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .su-input {
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
        .su-input::placeholder { color: rgba(148,163,184,0.45); }
        .su-input:focus {
          border-color: rgba(139,92,246,0.6);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
        }
        .su-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 0.3rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .su-btn {
          width: 100%;
          padding: 0.7rem 1rem;
          border-radius: 0.5rem;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%);
          color: white;
          letter-spacing: 0.04em;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(124,58,237,0.4);
        }
        .su-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 30px rgba(124,58,237,0.5);
        }
        .su-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .su-btn-ghost {
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border: 1px solid rgba(167,139,250,0.25);
          background: rgba(255,255,255,0.03);
          color: #94a3b8;
          transition: all 0.2s;
        }
        .su-btn-ghost:hover { border-color: rgba(167,139,250,0.5); color:#e2e8f0; }
        .circuit-line { stroke-dasharray:12 8; animation: dashFlow 2.5s linear infinite; }
        .perk-check { color: #4ade80; flex-shrink:0; margin-top:1px; }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#05010f 0%,#0d0820 35%,#060d1f 65%,#030a1a 100%)' }}
      >
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ animation:'gridPulse 6s ease-in-out infinite' }} preserveAspectRatio="none">
          <defs>
            <pattern id="sg" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7c3aed" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sg)"/>
        </svg>

        {/* Circuit lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity:0.06 }}>
          <line x1="0" y1="30%" x2="25%" y2="30%" stroke="#22d3ee" strokeWidth="1" className="circuit-line"/>
          <line x1="25%" y1="30%" x2="25%" y2="70%" stroke="#22d3ee" strokeWidth="1" className="circuit-line"/>
          <line x1="75%" y1="15%" x2="100%" y2="15%" stroke="#a78bfa" strokeWidth="1" className="circuit-line"/>
          <line x1="75%" y1="15%" x2="75%" y2="85%" stroke="#a78bfa" strokeWidth="1" className="circuit-line"/>
          <circle cx="25%" cy="30%" r="3" fill="#22d3ee" opacity="0.6"/>
          <circle cx="75%" cy="15%" r="3" fill="#a78bfa" opacity="0.6"/>
        </svg>

        {/* Glows */}
        <div className="absolute pointer-events-none" style={{ left:'10%',top:'15%',width:320,height:320,background:'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)',animation:'glowPulse 7s ease-in-out infinite',borderRadius:'50%' }}/>
        <div className="absolute pointer-events-none" style={{ right:'8%',bottom:'15%',width:260,height:260,background:'radial-gradient(circle,rgba(14,165,233,0.14) 0%,transparent 70%)',animation:'glowPulse 9s 2s ease-in-out infinite',borderRadius:'50%' }}/>

        {/* Scan line */}
        <div className="absolute inset-x-0 pointer-events-none" style={{ height:2,background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.4),rgba(34,211,238,0.5),rgba(139,92,246,0.4),transparent)',animation:'scanLine 8s linear infinite',top:0 }}/>

        <div className="w-full max-w-4xl relative z-10 flex flex-col lg:flex-row gap-8 items-stretch">

          {/* Left — perks panel */}
          <div className="lg:w-80 flex-shrink-0 flex flex-col justify-center space-y-6 px-2">
            <div>
              <Link to="/" style={{ textDecoration:'none',display:'flex',alignItems:'baseline',gap:0 }}>
                <span style={{ fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-1px',lineHeight:1 }}>CELL</span>
                <span style={{ fontSize:32,fontWeight:900,color:'#2dd4bf',letterSpacing:'-1px',lineHeight:1 }}>TECH</span>
                <span style={{ fontSize:15,fontWeight:800,color:'#38bdf8',marginLeft:5,letterSpacing:'3px',lineHeight:1 }}>POS</span>
              </Link>
              <p className="mt-2 text-sm" style={{ color:'rgba(148,163,184,0.7)' }}>
                The all-in-one platform for wireless & repair shops.
              </p>
            </div>

            <div className="su-card rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'#4ade80' }}>30-Day Free Trial</p>
              <p className="text-2xl font-bold text-white">Start for free</p>
              <p className="text-sm" style={{ color:'rgba(148,163,184,0.7)' }}>No credit card needed. Cancel anytime.</p>
              <div className="pt-2 space-y-2">
                {PERKS.map(p => (
                  <div key={p} className="flex items-start gap-2">
                    <svg className="perk-check w-4 h-4" fill="none" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.5"/>
                      <path d="M5 8l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm" style={{ color:'rgba(203,213,225,0.85)' }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs" style={{ color:'rgba(100,116,139,0.7)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color:'#818cf8' }}>Sign in →</Link>
            </p>
          </div>

          {/* Right — form */}
          <div className="flex-1">
            <div className="su-card rounded-2xl p-7">
              <h2 className="text-lg font-bold text-white mb-1">Create your account</h2>
              <p className="text-xs mb-4" style={{ color:'rgba(148,163,184,0.6)' }}>Set up your store in under a minute</p>


              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Store info */}
                <div>
                  <label className="su-label">Store / Business Name *</label>
                  <input className="su-input" placeholder="PC World Exchange" value={form.storeName} onChange={set('storeName')} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="su-label">City</label>
                    <input className="su-input" placeholder="Orlando" value={form.city} onChange={set('city')} />
                  </div>
                  <div>
                    <label className="su-label">State</label>
                    <input className="su-input" placeholder="FL" maxLength={2} value={form.state} onChange={set('state')} />
                  </div>
                </div>

                <div style={{ borderTop:'1px solid rgba(167,139,250,0.1)', paddingTop:'1rem', marginTop:'0.25rem' }}>
                  <p className="su-label mb-3" style={{ marginBottom:'0.75rem' }}>Your Account</p>
                  <div className="space-y-3">
                    <div>
                      <label className="su-label">Full Name *</label>
                      <input className="su-input" placeholder="John Smith" value={form.name} onChange={set('name')} required />
                    </div>
                    <div>
                      <label className="su-label">Email *</label>
                      <input type="email" className="su-input" placeholder="you@store.com" value={form.email} onChange={set('email')} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="su-label">Password *</label>
                        <input type="password" className="su-input" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
                      </div>
                      <div>
                        <label className="su-label">Confirm Password *</label>
                        <input type="password" className="su-input" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
                      </div>
                    </div>
                    <div>
                      <label className="su-label">Phone (optional)</label>
                      <input className="su-input" placeholder="(321) 000-0000" value={form.phone} onChange={set('phone')} />
                    </div>
                  </div>
                </div>

                <button type="submit" className="su-btn" disabled={loading} style={{ marginTop:'0.5rem' }}>
                  {loading ? 'Creating your account…' : 'Start My Free Trial →'}
                </button>

                <p className="text-center text-xs" style={{ color:'rgba(100,116,139,0.6)' }}>
                  By signing up you agree to our{' '}
                  <Link to="/terms" style={{ color:'#818cf8' }}>Terms</Link>{' '}and{' '}
                  <Link to="/privacy" style={{ color:'#818cf8' }}>Privacy Policy</Link>
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
