import { useState } from 'react';
import { Link } from 'react-router-dom';

const NAVY = '#0f172a';
const TEAL = '#0d9488';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', business: '', message: '' });
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus('sent');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: NAVY, minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>CELL</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-0.5px' }}>TECH</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', marginLeft: 4, letterSpacing: '2px' }}>POS</span>
          </Link>
          <Link to="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Contact Us</h1>
          <p style={{ color: '#94a3b8', fontSize: 16, margin: 0 }}>We'll get back to you within 24 hours.</p>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '48px 32px', borderRadius: 16, background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>Message Sent!</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 24px' }}>Thanks for reaching out. We'll reply to <strong style={{ color: '#2dd4bf' }}>{form.email}</strong> within 24 hours.</p>
            <Link to="/" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: TEAL, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>Back to Home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Your Name *" value={form.name} onChange={v => set('name', v)} placeholder="John Smith" />
              <Field label="Email Address *" type="email" value={form.email} onChange={v => set('email', v)} placeholder="john@yourstore.com" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Phone Number" type="tel" value={form.phone} onChange={v => set('phone', v)} placeholder="(321) 555-1234" />
              <Field label="Business Name" value={form.business} onChange={v => set('business', v)} placeholder="Metro Wireless" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Message *</label>
              <textarea
                rows={5}
                required
                value={form.message}
                onChange={e => set('message', e.target.value)}
                placeholder="Tell us about your store and what you're looking for..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {status === 'error' && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
                Something went wrong. Email us directly at <a href="mailto:support@celltechpos.com" style={{ color: '#2dd4bf' }}>support@celltechpos.com</a>
              </div>
            )}

            <button type="submit" disabled={status === 'sending'}
              style={{ padding: '15px', borderRadius: 10, background: `linear-gradient(135deg, ${TEAL}, #0f766e)`, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: status === 'sending' ? 'not-allowed' : 'pointer', opacity: status === 'sending' ? 0.7 : 1, boxShadow: '0 8px 24px rgba(13,148,136,0.3)' }}>
              {status === 'sending' ? 'Sending…' : 'Send Message →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', margin: 0 }}>
              Or email us directly at <a href="mailto:support@celltechpos.com" style={{ color: '#2dd4bf' }}>support@celltechpos.com</a>
            </p>
          </form>
        )}
      </div>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
        © 2026 PC World Exchange LLC · <Link to="/privacy" style={{ color: '#475569' }}>Privacy Policy</Link> · <Link to="/terms" style={{ color: '#475569' }}>Terms of Service</Link>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
    </div>
  );
}
