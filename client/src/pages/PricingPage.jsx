import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, XMarkIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const TEAL = '#0d9488';
const NAVY = '#0f172a';
const SLATE = '#475569';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    monthly: 49.99,
    annual: 41.99,
    color: '#0ea5e9',
    desc: 'Everything a single-location repair shop needs to get running.',
    cta: 'Start Free Trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 59.99,
    annual: 49.99,
    color: TEAL,
    badge: 'Most Popular',
    desc: 'Grow revenue with activations, loyalty, and marketing tools.',
    cta: 'Start Free Trial',
  },
  {
    key: 'multi',
    name: 'Multi-Location',
    monthly: 79.99,
    annual: 66.99,
    color: '#6366f1',
    desc: 'Full control across multiple stores with advanced reporting.',
    cta: 'Start Free Trial',
  },
];

const FEATURES = [
  { category: 'Core POS', rows: [
    { label: 'Point of Sale',               starter: true,    pro: true,    multi: true },
    { label: 'Repair Ticket Management',    starter: true,    pro: true,    multi: true },
    { label: 'Customer CRM',                starter: true,    pro: true,    multi: true },
    { label: 'Inventory Management',        starter: true,    pro: true,    multi: true },
    { label: 'Barcode / IMEI Tracking',     starter: true,    pro: true,    multi: true },
    { label: 'Estimates & Quotes',          starter: true,    pro: true,    multi: true },
    { label: 'Returns & Refunds',           starter: true,    pro: true,    multi: true },
    { label: 'Gift Cards',                  starter: true,    pro: true,    multi: true },
    { label: 'Expenses Tracking',           starter: true,    pro: true,    multi: true },
    { label: 'Parts Catalog',               starter: true,    pro: true,    multi: true },
    { label: 'Serial Number Tracking',      starter: true,    pro: true,    multi: true },
    { label: 'Reports & Analytics',         starter: true,    pro: true,    multi: true },
    { label: 'Recurring Invoices',          starter: false,   pro: true,    multi: true },
  ]},
  { category: 'Growth & Activation', rows: [
    { label: 'Carrier Activations',         starter: false,   pro: true,    multi: true },
    { label: 'Staff Commissions',           starter: false,   pro: true,    multi: true },
    { label: 'Loyalty Program',             starter: false,   pro: true,    multi: true },
    { label: 'Marketing Campaigns (Email/SMS)', starter: false, pro: true,  multi: true },
    { label: 'Appointment Scheduling',      starter: false,   pro: true,    multi: true },
    { label: 'Buyback / Trade-In',          starter: false,   pro: true,    multi: true },
    { label: 'SMS & Email Notifications',   starter: false,   pro: true,    multi: true },
    { label: 'Goals & Staff Leaderboard',   starter: false,   pro: true,    multi: true },
    { label: 'Customer Subscriptions',      starter: true,    pro: true,    multi: true },
  ]},
  { category: 'Operations', rows: [
    { label: 'Bill Payments & Top-Ups',     starter: false,   pro: false,   multi: true },
    { label: 'Layaway Plans',               starter: false,   pro: false,   multi: true },
    { label: 'Time Clock & Payroll',        starter: false,   pro: false,   multi: true },
    { label: 'Shift Scheduling',            starter: false,   pro: false,   multi: true },
    { label: 'Purchase Orders',             starter: false,   pro: false,   multi: true },
    { label: 'Inventory Counts',            starter: false,   pro: false,   multi: true },
    { label: 'Multi-Store Transfers',       starter: false,   pro: false,   multi: true },
    { label: 'Multi-Store Reports',         starter: false,   pro: false,   multi: true },
  ]},
  { category: 'Platform', rows: [
    { label: 'Locations',                   starter: '1',     pro: '1',     multi: 'Up to 3' },
    { label: 'Staff Accounts',              starter: '∞',     pro: '∞',     multi: '∞' },
    { label: 'Customer Display Mode',       starter: true,    pro: true,    multi: true },
    { label: 'Public Repair Status Page',   starter: true,    pro: true,    multi: true },
    { label: 'Public Storefront',           starter: true,    pro: true,    multi: true },
    { label: 'Stripe Card Payments at POS', starter: true,    pro: true,    multi: true },
    { label: 'Crypto Subscription Payment', starter: true,    pro: true,    multi: true },
    { label: 'Referral Program',            starter: true,    pro: true,    multi: true },
    { label: 'Daily Backup',               starter: true,    pro: true,    multi: true },
    { label: 'Support',                     starter: 'Email', pro: 'Priority', multi: 'Dedicated' },
  ]},
];

const FAQS = [
  { q: 'Is there really no contract?', a: 'Correct. CellTechPOS is month-to-month. Cancel anytime from your billing page and you won\'t be charged again. If you choose annual billing, your plan is paid upfront for the year.' },
  { q: 'What happens after the 30-day trial?', a: 'You\'ll be prompted to pick a plan. If you don\'t subscribe, your account is suspended (no data is deleted). You can reactivate anytime.' },
  { q: 'Can I switch plans later?', a: 'Yes. You can upgrade or downgrade at any time from the Billing page inside the app. Upgrades are prorated; downgrades take effect at the next billing cycle.' },
  { q: 'Do you charge per transaction?', a: 'No. We charge a flat monthly fee per store. We never take a percentage of your sales.' },
  { q: 'Can I pay with crypto?', a: 'Yes. In addition to card payments via Stripe, you can pay your CellTechPOS subscription with Bitcoin, Ethereum, USDC, and other major cryptocurrencies via Coinbase Commerce.' },
  { q: 'What if I have more than 3 locations?', a: 'Contact us. We offer custom enterprise pricing for chains with 4+ locations.' },
];

const TESTIMONIALS = [
  { name: 'Cell 4 Less Repair', role: 'Wireless Repair Store — Florida', text: 'We switched from paper tickets and a basic spreadsheet. CellTechPOS handles our repairs, inventory, and activations all in one place. Setup was the same day.', initials: 'C4', color: TEAL },
  { name: 'Marcus D.', role: 'Owner, Metro Wireless', text: 'CellTechPOS replaced 3 different tools we were using. My team learned it in a day and we haven\'t looked back.', initials: 'MD', color: '#6366f1' },
  { name: 'Tony M.', role: 'Owner, T&M Wireless', text: 'Commission tracking for activations used to take me hours every month. Now it\'s automatic. I wish I had this years ago.', initials: 'TM', color: '#f59e0b' },
];

function Check({ color }) {
  return <CheckIcon style={{ width: 18, height: 18, color: color || TEAL, flexShrink: 0 }} />;
}
function X() {
  return <XMarkIcon style={{ width: 16, height: 16, color: '#cbd5e1', flexShrink: 0 }} />;
}
function Cell({ val, color }) {
  if (val === true)  return <div style={{ display: 'flex', justifyContent: 'center' }}><Check color={color} /></div>;
  if (val === false) return <div style={{ display: 'flex', justifyContent: 'center' }}><X /></div>;
  return <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#334155' }}>{val}</div>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: NAVY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 767px) {
          .comparison-table { display: none !important; }
          .mobile-cards { display: block !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 60, gap: 20 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${TEAL}, #0f766e)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DevicePhoneMobileIcon style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>CellTechPOS</span>
          </a>
          <div style={{ flex: 1 }} />
          <a href="/#solutions" style={{ fontSize: 13, color: SLATE, textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="/#contact" style={{ fontSize: 13, color: SLATE, textDecoration: 'none', fontWeight: 500 }}>Contact</a>
          <Link to="/login" style={{ fontSize: 13, color: SLATE, textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          <Link to="/signup" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: TEAL, color: '#fff', textDecoration: 'none' }}>Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '72px 24px 56px', textAlign: 'center', background: 'linear-gradient(180deg, #f0fdfa 0%, #fff 100%)' }}>
        <div style={{ display: 'inline-block', background: '#ccfbf1', borderRadius: 999, padding: '4px 14px', marginBottom: 18 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pricing</span>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
          Simple pricing.<br />No surprises.
        </h1>
        <p style={{ fontSize: 18, color: SLATE, margin: '0 auto 36px', maxWidth: 520, lineHeight: 1.6 }}>
          Flat monthly rate per store. No transaction fees. No setup fees. Cancel anytime.
        </p>

        {/* Annual toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 999, padding: '6px 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: !annual ? NAVY : SLATE }}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
            style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', background: annual ? TEAL : '#cbd5e1', position: 'relative', transition: 'background 0.2s', padding: 0 }}
          >
            <div style={{ position: 'absolute', top: 2, left: annual ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: annual ? NAVY : SLATE }}>
            Annual <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>Save 17%</span>
          </span>
        </div>
      </section>

      {/* Plan cards */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {PLANS.map(p => {
            const price = annual ? p.annual : p.monthly;
            return (
              <div key={p.key} style={{ borderRadius: 20, padding: '36px 28px', border: p.badge ? `2px solid ${p.color}` : '1px solid #e2e8f0', boxShadow: p.badge ? `0 12px 48px ${p.color}20` : '0 2px 8px rgba(0,0,0,0.06)', position: 'relative', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                {p.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 999, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>{p.badge}</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: NAVY }}>${price.toFixed(2)}</span>
                  <span style={{ fontSize: 14, color: SLATE, paddingBottom: 8 }}>/mo</span>
                </div>
                {annual && (
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
                    Billed as ${(price * 12).toFixed(2)}/year
                    <span style={{ color: TEAL, fontWeight: 700, marginLeft: 6 }}>Save ${((p.monthly - p.annual) * 12).toFixed(2)}</span>
                  </p>
                )}
                <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.5, margin: '0 0 24px', flex: 1 }}>{p.desc}</p>
                <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: p.badge ? p.color : '#f1f5f9', color: p.badge ? '#fff' : NAVY, textDecoration: 'none' }}>
                  {p.cta}
                </Link>
                <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>30-day free trial · No card required</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature comparison table — desktop */}
      <section className="comparison-table" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40, letterSpacing: '-0.5px' }}>Full feature comparison</h2>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px', background: NAVY, padding: '16px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Feature</div>
              {PLANS.map(p => (
                <div key={p.key} style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: p.badge ? p.color : '#e2e8f0' }}>{p.name}</div>
              ))}
            </div>

            {FEATURES.map((section, si) => (
              <div key={section.category}>
                {/* Category header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px', padding: '10px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{section.category}</div>
                </div>

                {section.rows.map((row, ri) => (
                  <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px', padding: '12px 24px', borderTop: '1px solid #f1f5f9', background: ri % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#374151' }}>{row.label}</div>
                    <Cell val={row.starter} color={PLANS[0].color} />
                    <Cell val={row.pro}     color={PLANS[1].color} />
                    <Cell val={row.multi}   color={PLANS[2].color} />
                  </div>
                ))}
              </div>
            ))}

            {/* CTA row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px', padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: SLATE, alignSelf: 'center' }}>Start your free 30-day trial</div>
              {PLANS.map(p => (
                <Link key={p.key} to="/signup" style={{ display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, background: p.badge ? p.color : '#e2e8f0', color: p.badge ? '#fff' : NAVY, textDecoration: 'none' }}>
                  Get Started
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ background: '#f8fafc', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Trusted by repair shops</h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: SLATE, margin: '0 0 40px' }}>Real stores. Real results.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: '#f59e0b', fontSize: 15 }}>★</span>)}
                </div>
                <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{t.initials}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Pricing questions</h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: SLATE, margin: '0 0 40px' }}>Everything you need to know before choosing a plan.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
            {FAQS.map((f, i) => (
              <div key={f.q} style={{ padding: '20px 24px', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{f.q}</div>
                <div style={{ fontSize: 14, color: SLATE, lineHeight: 1.7 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0d2030 100%)`, padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.5px' }}>Ready to get started?</h2>
        <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 36px' }}>30-day free trial. No credit card required. Same-day setup.</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" style={{ padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: TEAL, color: '#fff', textDecoration: 'none' }}>Start Free Trial →</Link>
          <Link to="/contact" style={{ padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>Talk to Us</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#020617', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>Home</a>
          <a href="/pricing" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>Pricing</a>
          <Link to="/contact" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>Contact</Link>
          <Link to="/privacy" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>Terms</Link>
        </div>
        <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>© {new Date().getFullYear()} PC World Exchange LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
