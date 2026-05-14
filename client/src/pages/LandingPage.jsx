import { Link } from 'react-router-dom';
import {
  WrenchScrewdriverIcon, ShoppingCartIcon, CubeIcon,
  UsersIcon, SignalIcon, ChartBarIcon, ClockIcon,
  StarIcon, CalendarDaysIcon, CheckIcon,
  DevicePhoneMobileIcon, BanknotesIcon, ArchiveBoxIcon,
  Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

/* ── Brand colors ─────────────────────────────────────────────── */
const TEAL    = '#0d9488';
const TEAL_LT = '#ccfbf1';
const NAVY    = '#0f172a';
const SLATE   = '#475569';
const LGRAY   = '#f8fafc';

/* ── Data ─────────────────────────────────────────────────────── */
const stats = [
  { value: 'All-in-One',    label: 'No extra software needed' },
  { value: 'Real-time',     label: 'Live sales & inventory data' },
  { value: 'Multi-carrier', label: 'Boost, T-Mobile, AT&T & more' },
  { value: 'Cloud-based',   label: 'Access from any device' },
  { value: '24/7',          label: 'Support & uptime monitoring' },
  { value: '$49/mo',        label: 'Starts at — no hidden fees' },
];

const benefits = [
  {
    icon: ShoppingCartIcon,
    title: 'Streamline the front counter',
    desc: 'Fast POS checkout with cash, card, split pay, receipts, and layaway. Your staff closes sales in seconds, not minutes.',
  },
  {
    icon: ChartBarIcon,
    title: 'Improve planning & reduce costs',
    desc: 'Live inventory tracking, automatic reorder alerts, supplier purchase orders, and detailed profit reports keep you ahead.',
  },
  {
    icon: StarIcon,
    title: 'Build customer loyalty',
    desc: 'Loyalty points, repair history, targeted campaigns, and SMS/email follow-ups bring customers back every time.',
  },
];

const solutions = [
  {
    icon: WrenchScrewdriverIcon,
    color: TEAL,
    title: 'Repair Shop Management',
    desc: 'Full repair workflow from intake to pickup — ticket creation, parts tracking, technician notes, customer signature, warranty, and automated status notifications.',
    items: ['Ticket management', 'Parts & labor tracking', 'Customer signature capture', 'Mail-in repair support', 'Warranty tracking'],
  },
  {
    icon: SignalIcon,
    color: '#6366f1',
    title: 'Carrier Activations & Commissions',
    desc: 'Log new activations, plan upgrades, port-ins and SIM swaps for every major carrier. Commission and spiff tracking built right in.',
    items: ['Boost, T-Mobile, AT&T, Verizon', 'Commission & spiff tracking', 'ePay & VidaPay integration', 'Activation history per customer', 'Monthly commission reports'],
  },
  {
    icon: CubeIcon,
    color: '#f59e0b',
    title: 'Inventory & Purchasing',
    desc: 'Track every accessory, part, and device. Set reorder points, manage suppliers, create purchase orders, and run cycle counts without spreadsheets.',
    items: ['Real-time stock levels', 'Supplier & PO management', 'Barcode / SKU scanning', 'Reorder alerts', 'Inventory count audits'],
  },
];

const plans = [
  {
    name: 'Starter',
    price: '$49',
    color: '#0ea5e9',
    features: ['1 Location', 'POS & Repairs', 'Inventory', 'Customer CRM', 'Basic Reports', 'Email Support'],
  },
  {
    name: 'Pro',
    price: '$99',
    color: TEAL,
    badge: 'Most Popular',
    features: ['1 Location', 'Everything in Starter', 'Activations & Commissions', 'Loyalty Program', 'Marketing Campaigns', 'Priority Support'],
  },
  {
    name: 'Multi-Location',
    price: '$149',
    color: '#6366f1',
    features: ['Up to 3 Locations', 'Everything in Pro', 'Multi-store Reports', 'Staff Time Clock', 'Layaway Module', 'Dedicated Support'],
  },
];

const carriers = ['Boost Mobile', 'T-Mobile', 'AT&T', 'Verizon', 'Metro PCS', 'Cricket', 'Visible', 'Straight Talk'];

/* ── Helpers ──────────────────────────────────────────────────── */
function NavLink({ href, children }) {
  return (
    <a href={href}
      style={{ fontSize: 14, fontWeight: 500, color: '#cbd5e1', textDecoration: 'none', padding: '4px 2px' }}
      onMouseEnter={e => e.target.style.color = '#fff'}
      onMouseLeave={e => e.target.style.color = '#cbd5e1'}>
      {children}
    </a>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: TEAL_LT, borderRadius: 999, padding: '5px 14px', marginBottom: 16 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{children}</span>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────── */
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: NAVY, overflowX: 'hidden' }}>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: NAVY, padding: '0 24px',
        boxShadow: '0 1px 0 rgba(255,255,255,0.07)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', height: 66, gap: 40 }}>
          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: `linear-gradient(135deg, ${TEAL}, #0f766e)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DevicePhoneMobileIcon style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.4px' }}>CellTechPOS</span>
          </a>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1 }}
            className="hidden-mobile">
            <NavLink href="#solutions">Solutions</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#carriers">Carriers</NavLink>
            <NavLink href="#contact">Contact</NavLink>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = '#94a3b8'}>
              Sign In
            </Link>
            <a href="#contact" style={{
              padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 700,
              background: TEAL, color: '#fff', textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.target.style.background = '#0f766e'}
              onMouseLeave={e => e.target.style.background = TEAL}>
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <SectionLabel>Built for Wireless & Repair Retailers</SectionLabel>
          <h1 style={{
            fontSize: 'clamp(32px, 5.5vw, 60px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-1.5px', color: NAVY,
            margin: '0 0 22px',
          }}>
            Tomorrow's wireless retail<br />
            <span style={{ color: TEAL }}>technology, today.</span>
          </h1>
          <p style={{ fontSize: 18, color: SLATE, lineHeight: 1.7, maxWidth: 600, margin: '0 auto 40px', fontWeight: 400 }}>
            CellTechPOS is the all-in-one platform for cell phone stores and repair shops — manage POS, repairs, activations, inventory, staff, and customers from a single system.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#contact" style={{
              padding: '14px 34px', borderRadius: 8, fontSize: 15, fontWeight: 700,
              background: TEAL, color: '#fff', textDecoration: 'none',
            }}>
              Get Started →
            </a>
            <a href="#solutions" style={{
              padding: '14px 34px', borderRadius: 8, fontSize: 15, fontWeight: 700,
              background: '#fff', border: `2px solid #e2e8f0`,
              color: NAVY, textDecoration: 'none',
            }}>
              See Solutions
            </a>
          </div>

          {/* Hero cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 60 }}>
            {[
              { icon: ShoppingCartIcon, label: 'Point of Sale', sub: 'Fast checkout & receipts' },
              { icon: WrenchScrewdriverIcon, label: 'Repair Tickets', sub: 'Full repair workflow' },
              { icon: SignalIcon, label: 'Activations', sub: 'All major carriers' },
            ].map(c => (
              <div key={c.label} style={{
                background: LGRAY, borderRadius: 14, padding: '28px 20px',
                border: '1px solid #e2e8f0', textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `linear-gradient(135deg, ${TEAL}22, ${TEAL}11)`,
                  border: `1px solid ${TEAL}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <c.icon style={{ width: 24, height: 24, color: TEAL }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{c.label}</div>
                <div style={{ fontSize: 13, color: SLATE, marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section style={{ background: NAVY, padding: '48px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0 }}>
            {stats.map((s, i) => (
              <div key={s.value} style={{
                textAlign: 'center', padding: '16px 12px',
                borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: TEAL === '#0d9488' ? '#2dd4bf' : TEAL }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 5, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>Why CellTechPOS</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 14px', letterSpacing: '-0.5px' }}>
              Everything your store needs to thrive
            </h2>
            <p style={{ fontSize: 16, color: SLATE, maxWidth: 500, margin: '0 auto' }}>
              From the front counter to the back office, CellTechPOS covers every part of your wireless business.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {benefits.map(b => (
              <div key={b.title} style={{ padding: '8px 0' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: TEAL_LT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <b.icon style={{ width: 26, height: 26, color: TEAL }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: '0 0 10px' }}>{b.title}</h3>
                <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.7, margin: 0 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ────────────────────────────────────────────── */}
      <section id="solutions" style={{ background: LGRAY, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>Solutions</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 14px', letterSpacing: '-0.5px' }}>
              One platform, every workflow
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {solutions.map(s => (
              <div key={s.title} style={{
                background: '#fff', borderRadius: 16, padding: '32px 28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: s.color + '18', border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <s.icon style={{ width: 24, height: 24, color: s.color }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.7, margin: '0 0 20px' }}>{s.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {s.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#334155' }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        background: s.color + '20', border: `1px solid ${s.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckIcon style={{ width: 9, height: 9, color: s.color }} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── More features strip ───────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: NAVY, margin: '0 0 10px', letterSpacing: '-0.4px' }}>
              More tools, zero extra subscriptions
            </h2>
            <p style={{ fontSize: 15, color: SLATE }}>Every feature below is included in your plan — no add-ons required.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: UsersIcon,        label: 'Customer CRM' },
              { icon: CalendarDaysIcon, label: 'Appointments' },
              { icon: ClockIcon,        label: 'Employee Time Clock' },
              { icon: BanknotesIcon,    label: 'Bill Payments' },
              { icon: ArchiveBoxIcon,   label: 'Layaway Plans' },
              { icon: StarIcon,         label: 'Loyalty Program' },
            ].map(f => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: LGRAY, borderRadius: 10, padding: '16px 18px',
                border: '1px solid #e2e8f0',
              }}>
                <f.icon style={{ width: 20, height: 20, color: TEAL, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Carriers ─────────────────────────────────────────────── */}
      <section id="carriers" style={{ background: LGRAY, padding: '56px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 28 }}>
            Supports activations & tracking for
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {carriers.map(c => (
              <div key={c} style={{
                padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                background: '#fff', border: '1px solid #e2e8f0', color: '#334155',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <SectionLabel>Pricing</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 16, color: SLATE }}>No contracts. No hidden fees. Cancel anytime.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {plans.map(p => (
              <div key={p.name} style={{
                background: '#fff', borderRadius: 16, padding: '36px 30px',
                border: p.badge ? `2px solid ${p.color}` : '1px solid #e2e8f0',
                boxShadow: p.badge ? `0 4px 24px ${p.color}22` : '0 1px 4px rgba(0,0,0,0.05)',
                position: 'relative',
              }}>
                {p.badge && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: p.color, color: '#fff', fontSize: 11, fontWeight: 800,
                    padding: '3px 14px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.badge}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {p.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 28 }}>
                  <span style={{ fontSize: 46, fontWeight: 900, color: NAVY, lineHeight: 1 }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: SLATE, paddingBottom: 7 }}>/month</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#334155' }}>
                      <CheckIcon style={{ width: 16, height: 16, color: p.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 700,
                  background: p.badge ? p.color : '#f1f5f9',
                  color: p.badge ? '#fff' : NAVY,
                  textDecoration: 'none', border: 'none',
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => e.target.style.opacity = '0.85'}
                  onMouseLeave={e => e.target.style.opacity = '1'}>
                  Get Started
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#94a3b8' }}>
            Annual billing available — save up to 2 months. Multi-location discounts available.
          </p>
        </div>
      </section>

      {/* ── CTA / Contact ────────────────────────────────────────── */}
      <section id="contact" style={{ background: NAVY, padding: '80px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <SectionLabel>Get Started Today</SectionLabel>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Ready to modernize your store?
          </h2>
          <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 40px', lineHeight: 1.7 }}>
            We'll set up your account, import your data, and have your team live within 24 hours. Reach out and let's get started.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <a href="mailto:support@celltechpos.com" style={{
              padding: '14px 34px', borderRadius: 9, fontSize: 15, fontWeight: 700,
              background: TEAL, color: '#fff', textDecoration: 'none',
            }}>
              Email Us
            </a>
            <Link to="/login" style={{
              padding: '14px 34px', borderRadius: 9, fontSize: 15, fontWeight: 700,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0', textDecoration: 'none',
            }}>
              Sign In to Your Account
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['⚡ Same-day setup', '🔒 Secure & encrypted', '📞 Ongoing support'].map(item => (
              <span key={item} style={{ fontSize: 13, color: '#64748b' }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{ background: '#020617', padding: '48px 24px 28px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${TEAL}, #0f766e)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DevicePhoneMobileIcon style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>CellTechPOS</span>
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                The complete point-of-sale platform for wireless and repair retailers.
              </p>
            </div>

            {/* Solutions */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Solutions</div>
              {['Point of Sale', 'Repair Management', 'Activations', 'Inventory', 'Customer CRM'].map(l => (
                <a key={l} href="#solutions" style={{ display: 'block', fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 9 }}
                  onMouseEnter={e => e.target.style.color = '#94a3b8'}
                  onMouseLeave={e => e.target.style.color = '#475569'}>
                  {l}
                </a>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Company</div>
              {['Pricing', 'Carriers', 'Contact Us'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(' ', '')}`} style={{ display: 'block', fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 9 }}
                  onMouseEnter={e => e.target.style.color = '#94a3b8'}
                  onMouseLeave={e => e.target.style.color = '#475569'}>
                  {l}
                </a>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Contact</div>
              <a href="mailto:support@celltechpos.com" style={{ display: 'block', fontSize: 13, color: '#475569', textDecoration: 'none', marginBottom: 9 }}
                onMouseEnter={e => e.target.style.color = '#94a3b8'}
                onMouseLeave={e => e.target.style.color = '#475569'}>
                support@celltechpos.com
              </a>
              <Link to="/login" style={{ display: 'block', fontSize: 13, color: TEAL, textDecoration: 'none', fontWeight: 600 }}>
                Sign In →
              </Link>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#334155' }}>© {new Date().getFullYear()} CellTechPOS. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy Policy', 'Terms of Service'].map(l => (
                <a key={l} href="#" style={{ fontSize: 12, color: '#334155', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = '#64748b'}
                  onMouseLeave={e => e.target.style.color = '#334155'}>
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
