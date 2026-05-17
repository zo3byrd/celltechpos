import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CellTechLogo from '../components/Logo';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import {
  WrenchScrewdriverIcon, ShoppingCartIcon, CubeIcon,
  UsersIcon, SignalIcon, ChartBarIcon, ClockIcon,
  StarIcon, CalendarDaysIcon, CheckIcon,
  DevicePhoneMobileIcon, BanknotesIcon, ArchiveBoxIcon,
  ArrowRightIcon, BoltIcon, ShieldCheckIcon,
  Bars3Icon, XMarkIcon, CurrencyDollarIcon,
  DocumentTextIcon, ArrowPathIcon, ArrowUturnLeftIcon,
  TruckIcon, MegaphoneIcon, ChatBubbleLeftRightIcon,
  ComputerDesktopIcon, PrinterIcon, PaperClipIcon,
  KeyIcon, BuildingStorefrontIcon, ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

const TEAL  = '#0d9488';
const NAVY  = '#0f172a';
const SLATE = '#475569';
const LGRAY = '#f1f5f9';

/* ─── Inline CSS injected once ────────────────────────────────── */
const globalStyle = `
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes pulse-ring { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.6);opacity:0} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.6s ease both; }
  .float-anim { animation: float 4s ease-in-out infinite; }
  .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
  .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important; }
  .nav-desktop-links { display: flex; align-items: center; gap: 28px; flex: 1; }
  .nav-desktop-actions { display: flex; align-items: center; gap: 12px; }
  .nav-hamburger { display: none; }
  .nav-mobile-menu { display: none; }
  .nav-logo-desktop { display: flex; }
  .nav-logo-mobile { display: none; }
  @media (max-width: 767px) {
    .nav-desktop-links { display: none; }
    .nav-desktop-actions { display: none; }
    .nav-hamburger { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 8px; color: #94a3b8; }
    .nav-mobile-menu { display: block; background: rgba(15,23,42,0.99); border-top: 1px solid rgba(255,255,255,0.08); padding: 12px 20px 20px; }
    .nav-mobile-link { display: block; padding: 13px 0; font-size: 16px; font-weight: 500; color: #94a3b8; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .nav-mobile-link:last-child { border-bottom: none; }
    .nav-logo-desktop { display: none; }
    .nav-logo-mobile { display: flex; }
    .hero-grid { grid-template-columns: 1fr !important; }
    .hero-phone { display: none !important; }
  }
  @media (min-width: 768px) {
    .step-connector { display: block !important; }
  }
`;

/* ─── Mock POS Screen content (inside phone mockup) ───────────── */
function MockPOS() {
  return (
    <div style={{ background: '#0f172a', height: '100%', padding: '12px 10px', fontFamily: 'monospace', fontSize: 9 }}>
      <div style={{ background: '#1e293b', borderRadius: 6, padding: '6px 8px', marginBottom: 8 }}>
        <div style={{ color: '#94a3b8', fontSize: 8 }}>POINT OF SALE</div>
        <div style={{ color: '#10b981', fontWeight: 700, fontSize: 11 }}>CellTechPOS</div>
      </div>
      {[
        { name: 'iPhone 15 Case', price: '$24.99' },
        { name: 'Screen Protector', price: '$14.99' },
        { name: 'USB-C Cable', price: '$9.99' },
      ].map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 6px', background: i % 2 === 0 ? '#1a2540' : 'transparent', borderRadius: 4, marginBottom: 2 }}>
          <span style={{ color: '#cbd5e1', fontSize: 8.5 }}>{item.name}</span>
          <span style={{ color: '#10b981', fontWeight: 700, fontSize: 8.5 }}>{item.price}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px' }}>
          <span style={{ color: '#64748b', fontSize: 8 }}>Subtotal</span>
          <span style={{ color: '#94a3b8', fontSize: 8 }}>$49.97</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px' }}>
          <span style={{ color: '#64748b', fontSize: 8 }}>Tax</span>
          <span style={{ color: '#94a3b8', fontSize: 8 }}>$4.12</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#0d9488', borderRadius: 4, marginTop: 4 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 9 }}>TOTAL</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 9 }}>$54.09</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 }}>
        <div style={{ background: '#1e3a5f', borderRadius: 4, padding: '6px 0', textAlign: 'center', color: '#60a5fa', fontSize: 8, fontWeight: 700 }}>CARD</div>
        <div style={{ background: '#14532d', borderRadius: 4, padding: '6px 0', textAlign: 'center', color: '#4ade80', fontSize: 8, fontWeight: 700 }}>CASH</div>
      </div>
      <div style={{ marginTop: 8, background: '#1e293b', borderRadius: 6, padding: '6px 8px' }}>
        <div style={{ color: '#64748b', fontSize: 7.5, marginBottom: 3 }}>RECENT REPAIRS</div>
        {[
          { ticket: '#1042', device: 'iPhone 13', status: 'Ready' },
          { ticket: '#1041', device: 'Samsung S23', status: 'In Repair' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#94a3b8', fontSize: 8 }}>{r.ticket} · {r.device}</span>
            <span style={{ color: r.status === 'Ready' ? '#10b981' : '#f59e0b', fontSize: 7.5, fontWeight: 700 }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Phone Mockup ─────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="float-anim" style={{ position: 'relative', zIndex: 2 }}>
      {/* Glow behind phone */}
      <div style={{
        position: 'absolute', inset: -30, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(13,148,136,0.25) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />
      {/* Phone frame */}
      <div style={{
        width: 220, height: 440,
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        borderRadius: 36,
        border: '6px solid #334155',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1,
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 20, background: '#1e293b',
          borderBottomLeftRadius: 14, borderBottomRightRadius: 14, zIndex: 10,
        }} />
        <div style={{ paddingTop: 20, height: '100%' }}>
          <MockPOS />
        </div>
      </div>
      {/* Side button */}
      <div style={{
        position: 'absolute', right: -8, top: 100,
        width: 4, height: 40, background: '#334155', borderRadius: 2,
      }} />
    </div>
  );
}

/* ─── Laptop Mockup ────────────────────────────────────────────── */
function LaptopMockup() {
  return (
    <div style={{ position: 'relative' }}>
      {/* Screen */}
      <div style={{
        width: '100%', maxWidth: 580,
        background: '#0f172a',
        borderRadius: '14px 14px 0 0',
        border: '8px solid #1e293b',
        borderBottom: 'none',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        margin: '0 auto',
      }}>
        {/* Browser chrome */}
        <div style={{ background: '#1e293b', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ef4444','#f59e0b','#10b981'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, background: '#0f172a', borderRadius: 6, padding: '4px 12px', fontSize: 10, color: '#475569', textAlign: 'center' }}>
            celltechpos.com/app
          </div>
        </div>
        {/* Dashboard content */}
        <div style={{ padding: '12px', background: '#f8fafc', height: 260, overflow: 'hidden' }}>
          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: "Today's Sales", value: '$1,247', color: '#10b981' },
              { label: 'Open Repairs', value: '8', color: '#f59e0b' },
              { label: 'Activations', value: '3', color: '#6366f1' },
              { label: 'Low Stock', value: '5', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Chart placeholder */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Revenue — Last 30 Days</div>
            <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
              {[40,55,35,70,60,80,65,90,75,85,70,95,80,100,88,92,78,85,90,95,88,100,85,92,78,85,95,100,90,95].map((h, i) => (
                <div key={i} style={{
                  flex: 1, height: `${h}%`,
                  background: `linear-gradient(to top, ${TEAL}, ${TEAL}88)`,
                  borderRadius: '2px 2px 0 0', opacity: 0.8,
                }} />
              ))}
            </div>
          </div>
          {/* Repair list */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Ready for Pickup</div>
            {[
              { ticket: '#1042', name: 'Maria G.', device: 'iPhone 14 Pro', cost: '$149' },
              { ticket: '#1039', name: 'James W.', device: 'Samsung S23', cost: '$89' },
              { ticket: '#1037', name: 'Linda T.', device: 'iPad Air', cost: '$199' },
            ].map(r => (
              <div key={r.ticket} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 8, color: '#6366f1', fontWeight: 700, width: 36 }}>{r.ticket}</span>
                <span style={{ fontSize: 8, color: '#334155', flex: 1 }}>{r.name} · {r.device}</span>
                <span style={{ fontSize: 8, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>{r.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Keyboard base */}
      <div style={{
        height: 22, background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
        borderRadius: '0 0 14px 14px',
        border: '8px solid #1e293b',
        borderTop: 'none',
        margin: '0 auto',
        maxWidth: 580,
      }}>
        <div style={{
          width: 80, height: 8, background: '#334155',
          borderRadius: '0 0 8px 8px', margin: '0 auto',
        }} />
      </div>
      {/* Stand */}
      <div style={{
        width: 100, height: 6, background: '#1e293b',
        borderRadius: 4, margin: '0 auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

const features = [
  { icon: ShoppingCartIcon,        title: 'Point of Sale',         desc: 'Fast checkout with split payments, cash drawer, digital receipts and daily close reports.',         color: '#0d9488' },
  { icon: WrenchScrewdriverIcon,   title: 'Repair Tickets',        desc: 'Full intake-to-pickup workflow with parts, labor, customer signature and 90-day warranty tracking.', color: '#6366f1' },
  { icon: CubeIcon,                title: 'Inventory',             desc: 'Real-time stock levels, low-stock alerts, barcode label printing and multi-supplier support.',        color: '#f59e0b' },
  { icon: SignalIcon,              title: 'Carrier Activations',   desc: 'Log new lines, upgrades and ports for Boost, T-Mobile, AT&T, Metro and more with auto commissions.',  color: '#0ea5e9' },
  { icon: UsersIcon,               title: 'Customer CRM',          desc: 'Complete customer profiles with repair history, purchase records, loyalty points and ID verification.',color: '#ec4899' },
  { icon: CalendarDaysIcon,        title: 'Appointments',          desc: 'Schedule drop-offs and walk-ins, assign techs and send automated SMS/email reminders.',              color: '#8b5cf6' },
  { icon: DocumentTextIcon,        title: 'Estimates',             desc: 'Create professional estimates with line items, send approval links and convert to repair tickets.',   color: '#14b8a6' },
  { icon: ArrowPathIcon,           title: 'Recurring Invoices',    desc: 'Set up weekly, monthly or yearly billing contracts that auto-generate invoices on schedule.',         color: '#a855f7' },
  { icon: ArrowUturnLeftIcon,      title: 'Buyback / Trade-In',    desc: 'Quote, purchase and optionally add used devices to inventory with automatic 30% markup pricing.',    color: '#f43f5e' },
  { icon: BanknotesIcon,           title: 'Bill Payments',         desc: 'Process prepaid PINs, mobile top-ups, bill payments and money orders all from one screen.',  color: '#22c55e' },
  { icon: TruckIcon,               title: 'Purchase Orders',       desc: 'Create POs, track supplier orders and auto-update stock when shipments are received.',                color: '#f97316' },
  { icon: ArchiveBoxIcon,          title: 'Layaway',               desc: 'Flexible layaway plans with deposit tracking, payment schedules and automatic completion.',           color: '#06b6d4' },
  { icon: StarIcon,                title: 'Loyalty Program',       desc: 'Reward repeat customers with points per dollar that convert to real discounts at checkout.',          color: '#eab308' },
  { icon: MegaphoneIcon,           title: 'Marketing Campaigns',   desc: 'Send targeted SMS and email campaigns to all customers, loyalty members or inactive clients.',        color: '#f97316' },
  { icon: ChatBubbleLeftRightIcon, title: 'Messages',              desc: 'Two-way SMS and email with customers linked directly to repair tickets and customer records.',        color: '#3b82f6' },
  { icon: CurrencyDollarIcon,      title: 'Commissions',           desc: 'Auto-calculate staff commissions on sales, repairs and activations with monthly payout reports.',    color: '#10b981' },
  { icon: ClockIcon,               title: 'Time Clock',            desc: 'PIN-based clock in/out, break tracking, hourly earnings and payroll-ready export by employee.',       color: '#f97316' },
  { icon: ChartBarIcon,            title: 'Reports & Analytics',   desc: 'Daily sales, tech performance, revenue trends, inventory value and commission summaries.',            color: '#6366f1' },
  { icon: ComputerDesktopIcon,     title: 'Shop Display Board',    desc: 'Live TV display showing repair ticket statuses — customers can see where their device stands.',      color: '#0ea5e9' },
  { icon: PrinterIcon,             title: 'Barcode Label Printing', desc: 'Generate and print 2.25" × 1.25" barcode labels for any inventory item in one click.',             color: '#64748b' },
  { icon: PaperClipIcon,           title: 'Repair Attachments',    desc: 'Upload photos, PDFs and documents directly to repair tickets for before/after documentation.',       color: '#ec4899' },
  { icon: ShieldCheckIcon,         title: 'Inventory Counts',      desc: 'Conduct full or partial cycle counts, track variances and reconcile stock discrepancies.',           color: '#84cc16' },
];

const plans = [
  { name: 'Starter', price: '$49.99', color: '#0ea5e9', features: ['1 Location', 'POS & Repairs', 'Inventory', 'Customer CRM', 'Basic Reports', 'Email Support'] },
  { name: 'Pro',     price: '$59.99', color: TEAL, badge: 'Most Popular', features: ['1 Location', 'Everything in Starter', 'Activations & Commissions', 'Loyalty Program', 'Marketing Campaigns', 'Priority Support'] },
  { name: 'Multi',   price: '$79.99', color: '#6366f1', features: ['Up to 3 Locations', 'Everything in Pro', 'Multi-store Reports', 'Staff Time Clock', 'Layaway Module', 'Dedicated Support'] },
];

const testimonials = [
  { name: 'Cell 4 Less Repair', role: 'Wireless Repair Store — Florida', text: 'We switched from paper tickets and a basic spreadsheet. CellTechPOS handles our repairs, inventory, and activations all in one place. Setup was the same day and the support is real.', initials: 'C4', color: '#0d9488', featured: true },
  { name: 'Marcus D.', role: 'Owner, Metro Wireless', text: 'CellTechPOS replaced 3 different tools we were using. Repairs, activations, and inventory are all in one place now. My team learned it in a day.', initials: 'MD', color: '#6366f1' },
  { name: 'Tony M.', role: 'Owner, T&M Wireless', text: 'Commission tracking for activations used to take me hours every month. Now it\'s automatic. I wish I had this years ago.', initials: 'TM', color: '#f59e0b' },
];

const carriers = ['Boost Mobile', 'T-Mobile', 'AT&T', 'Verizon', 'Metro PCS', 'Cricket Wireless', 'Visible', 'Straight Talk'];

const faqs = [
  { q: 'Do I need special hardware?', a: 'No. CellTechPOS runs in any modern browser — on a tablet, laptop, or desktop. You can connect a USB receipt printer and barcode scanner, but they\'re optional.' },
  { q: 'How long does setup take?', a: 'Most shops are fully live within 24 hours. We help you import your inventory and customer list, and our team is available to walk you through the setup.' },
  { q: 'Can I import my existing data?', a: 'Yes. You can upload your customers and inventory items via CSV files. We also support bulk barcode imports, parts catalog uploads, and manual data entry.' },
  { q: 'How many staff users can I add?', a: 'Unlimited staff accounts on all plans. Each employee gets their own login with role-based access and their own PIN for the time clock.' },
  { q: 'Is there a long-term contract?', a: 'No. All plans are month-to-month. Upgrade, downgrade, or cancel at any time — no cancellation fees, no questions asked.' },
  { q: 'What payment methods work at checkout?', a: 'Cash, card (manual entry or Stripe terminal), check, split payments, gift cards, and layaway. Stripe is built-in for card-not-present payments.' },
  { q: 'Do you support multiple locations?', a: 'Yes. The Multi plan supports up to 3 locations with inter-store inventory transfers, shared customer records, and consolidated reporting.' },
  { q: 'Is my data secure and backed up?', a: 'Yes. All data is encrypted in transit and at rest, backed up automatically every night, and hosted on secure cloud infrastructure. We never share your data.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>{q}</span>
        <span style={{ fontSize: 22, color: TEAL, flexShrink: 0, display: 'inline-block', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', lineHeight: 1 }}>+</span>
      </button>
      {open && <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.75, margin: '0 0 18px', maxWidth: 680 }}>{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { token, user, setAuth } = useAuthStore();
  const appPath = user?.role === 'superadmin' ? '/superadmin' : '/app';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  async function handleDemo() {
    setDemoLoading(true);
    try {
      const { data } = await api.post('/auth/demo');
      setAuth(data.token, data.user, data.plan, null);
      navigate('/app');
    } catch {
      alert('Demo is temporarily unavailable. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: NAVY, overflowX: 'hidden' }}>
      <style>{globalStyle}</style>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, padding: '0 20px' }}>
          {/* Logo — full SVG on desktop, text on mobile */}
          <a href="/" className="nav-logo-desktop" style={{ alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <CellTechLogo height={52} />
          </a>
          <a href="/" className="nav-logo-mobile" style={{ alignItems: 'center', textDecoration: 'none', flexShrink: 0, gap: 0 }}>
            <span style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>CELL</span>
            <span style={{ fontSize: 19, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-0.5px', lineHeight: 1 }}>TECH</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginLeft: 4, letterSpacing: '2px', lineHeight: 1 }}>POS</span>
          </a>

          {/* Desktop nav links */}
          <div className="nav-desktop-links">
            {[['#solutions','Solutions'],['#features','Features'],['/pricing','Pricing'],['#contact','Contact']].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='#94a3b8'}>{label}</a>
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="nav-desktop-actions">
            {token ? (
              <Link to={appPath} style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: TEAL, color: '#fff', textDecoration: 'none' }}>
                Open App →
              </Link>
            ) : (
              <>
                <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='#64748b'}>Sign In</Link>
                <Link to="/signup" style={{ padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: TEAL, color: '#fff', textDecoration: 'none' }}>Start Free Trial</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="nav-hamburger" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Toggle menu">
            {mobileMenuOpen
              ? <XMarkIcon style={{ width: 26, height: 26 }} />
              : <Bars3Icon style={{ width: 26, height: 26 }} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="nav-mobile-menu">
            {[['#solutions','Solutions'],['#features','Features'],['/pricing','Pricing'],['#contact','Contact']].map(([href, label]) => (
              <a key={href} href={href} className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>{label}</a>
            ))}
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {token ? (
                <Link to={appPath} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: TEAL, color: '#fff', textDecoration: 'none' }}>
                  Open App →
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                    style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#94a3b8', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Sign In
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}
                    style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: TEAL, color: '#fff', textDecoration: 'none' }}>
                    Start Free Trial →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0d1f3c 50%, #0d2030 100%)`,
        padding: '80px 24px 100px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

        <div className="hero-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: 60, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Left: Text */}
          <div className="fade-up">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 999, padding: '6px 16px', marginBottom: 28 }}>
              <BoltIcon style={{ width: 13, height: 13, color: '#2dd4bf' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf', letterSpacing: '0.06em' }}>Built for Wireless & Repair Shops</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 62px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', color: '#fff', margin: '0 0 22px' }}>
              Tomorrow's wireless<br />
              <span style={{ background: `linear-gradient(90deg, #2dd4bf, #38bdf8)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                retail technology,
              </span>
              <br />today.
            </h1>
            <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, maxWidth: 500, margin: '0 0 40px' }}>
              The all-in-one platform for cell phone stores and repair shops. Manage POS, repairs, activations, inventory and your whole team from one powerful system.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link to="/signup" style={{ padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: `linear-gradient(135deg, ${TEAL}, #0f766e)`, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 8px 24px rgba(13,148,136,0.35)` }}>
                Get Started Free <ArrowRightIcon style={{ width: 16, height: 16 }} />
              </Link>
              <button onClick={handleDemo} disabled={demoLoading} style={{ padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', cursor: demoLoading ? 'wait' : 'pointer', opacity: demoLoading ? 0.7 : 1 }}>
                {demoLoading ? 'Loading…' : '▶ Try Live Demo'}
              </button>
            </div>
            {/* Trust row */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                [ShieldCheckIcon, 'No contracts'],
                [BoltIcon, 'Live in 24 hours'],
                [DevicePhoneMobileIcon, 'Works on any device'],
              ].map(([Icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#64748b' }}>
                  <Icon style={{ width: 15, height: 15, color: '#2dd4bf' }} />{text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="hero-phone" style={{ display: 'flex', justifyContent: 'center', paddingRight: 20 }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[
              { value: '22+ Modules',    sub: 'One platform, no add-ons' },
              { value: '8+ Carriers',    sub: 'Boost, T-Mobile & more' },
              { value: '30-Day Trial',   sub: 'No credit card required' },
              { value: 'Unlimited Staff', sub: 'Every plan, no extra cost' },
              { value: 'No Contracts',   sub: 'Cancel anytime' },
              { value: 'From $49.99/mo', sub: 'All features included' },
            ].map((s, i, arr) => (
              <div key={s.value} style={{ textAlign: 'center', padding: '28px 16px', borderRight: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: NAVY, letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '80px 24px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#dcfce7', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Getting Started</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Up and running in minutes</h2>
            <p style={{ fontSize: 16, color: SLATE, maxWidth: 480, margin: '0 auto' }}>No IT team required. Most shops are fully live within 24 hours of signing up.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 40 }}>
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up in 2 minutes. Your 30-day free trial starts immediately — no credit card required.', icon: '🚀', color: TEAL },
              { step: '02', title: 'Set up your store', desc: 'Add your inventory, staff, and tax rate. Import existing customers and items from a CSV file.', icon: '⚙️', color: '#6366f1' },
              { step: '03', title: 'Go live today', desc: 'Start ringing up sales, logging repairs, and tracking inventory right away. Most teams learn it in under an hour.', icon: '✅', color: '#10b981' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${s.color}22, ${s.color}10)`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: s.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Step {s.step}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, background: `linear-gradient(135deg, ${TEAL}, #0f766e)`, color: '#fff', textDecoration: 'none', boxShadow: `0 8px 24px rgba(13,148,136,0.3)` }}>
              Start your free trial <ArrowRightIcon style={{ width: 16, height: 16 }} />
            </Link>
            <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>30 days free · No credit card · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ── Dashboard Showcase ──────────────────────────────────── */}
      <section style={{ background: LGRAY, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#ede9fe', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase' }}>See It In Action</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Your entire store, one dashboard</h2>
            <p style={{ fontSize: 16, color: SLATE, maxWidth: 520, margin: '0 auto' }}>
              Everything your team needs — from POS checkout to repair tickets — visible at a glance the moment they log in.
            </p>
          </div>
          <LaptopMockup />
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────── */}
      <section id="features" style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#ccfbf1', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Features</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Everything your shop needs</h2>
            <p style={{ fontSize: 16, color: SLATE, maxWidth: 480, margin: '0 auto' }}>One platform covers every corner of your wireless business — no subscriptions stacked on subscriptions.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} className="card-hover" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '24px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + '18', border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <f.icon style={{ width: 22, height: 22, color: f.color }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: SLATE, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Features ──────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 999, padding: '6px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 14 }}>✨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Powered by AI</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Built-in AI that works for you</h2>
            <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>CellTechPOS uses Claude AI to automate diagnosis, forecast inventory, generate marketing copy, and flag risk — all without leaving your dashboard.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {[
              {
                emoji: '🔧',
                title: 'AI Repair Notes',
                desc: 'Type the device and customer complaint — AI writes a professional technician diagnosis in seconds. Saves time on every ticket.',
                color: '#6366f1',
              },
              {
                emoji: '📊',
                title: 'AI Sales Insights',
                desc: 'Your dashboard auto-generates business insights from the last 30 days of sales data every time you log in. No setup needed.',
                color: '#8b5cf6',
              },
              {
                emoji: '📦',
                title: 'AI Inventory Forecasting',
                desc: 'Instantly see which parts are at or below reorder point, with smart restocking recommendations tailored to a repair shop.',
                color: '#0ea5e9',
              },
              {
                emoji: '📱',
                title: 'AI Marketing Campaigns',
                desc: 'Generate SMS and email campaign copy in one click. Just enter your promotion and target audience — AI writes it for you.',
                color: '#10b981',
              },
              {
                emoji: '💬',
                title: 'AI Customer Support',
                desc: 'AI-assisted responses help your team handle common customer questions faster, keeping service quality consistent.',
                color: '#f59e0b',
              },
              {
                emoji: '🛡️',
                title: 'AI Fraud & Risk Detection',
                desc: 'Flag suspicious transactions, duplicate IMEIs, and unusual patterns before they become a problem for your store.',
                color: '#ef4444',
              },
            ].map(f => (
              <div key={f.title} className="card-hover" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 24px', backdropFilter: 'blur(4px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: f.color + '22', border: `1px solid ${f.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {f.emoji}
                  </div>
                  <div style={{ display: 'inline-block', background: f.color + '22', borderRadius: 999, padding: '3px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: f.color }}>AI-Powered</span>
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>Included in every plan — no extra AI subscription required.</p>
            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
              ✨ Try AI Features Free <ArrowRightIcon style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Solutions ────────────────────────────────────────────── */}
      <section id="solutions" style={{ background: NAVY, padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Solutions</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>One platform, every workflow</h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 520, margin: '0 auto' }}>Purpose-built for wireless retail and repair shops from day one.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { icon: WrenchScrewdriverIcon, color: TEAL,      title: 'Repair Management',      desc: 'Full repair workflow from intake to pickup.',           items: ['Ticket tracking & status updates', 'Parts & labor cost tracking', 'Photo & file attachments', 'Customer signature capture', 'Job timer per technician', 'Warranty management', 'Mail-in repair support'] },
              { icon: SignalIcon,            color: '#6366f1', title: 'Carrier Activations',    desc: 'All major carriers, commissions auto-calculated.',       items: ['Boost, T-Mobile, AT&T, Verizon', 'Metro, Cricket, Visible & more', 'Commission & spiff tracking', 'New lines, upgrades & ports', 'Monthly payout reports'] },
              { icon: CubeIcon,             color: '#f59e0b', title: 'Inventory & Purchasing', desc: 'Never run out of stock again.',                          items: ['Real-time stock levels', 'Low-stock & reorder alerts', 'Barcode label printing', 'Supplier & PO management', 'Serial number tracking', 'Cycle count audits'] },
              { icon: UsersIcon,            color: '#ec4899', title: 'Customer & Growth',      desc: 'Build lasting relationships and grow revenue.',          items: ['Full CRM with repair history', 'Loyalty points & rewards', 'SMS & email marketing campaigns', 'Two-way messaging', 'Automated appointment reminders', 'Customer portal for ticket lookup'] },
              { icon: ShoppingCartIcon,     color: '#0ea5e9', title: 'Sales & Billing',        desc: 'Every revenue stream under one roof.',                   items: ['POS with split payments', 'Estimates with approval links', 'Recurring invoice contracts', 'Layaway & payment plans', 'Bill payments & prepaid PINs', 'Buyback / trade-in purchasing'] },
              { icon: ChartBarIcon,         color: '#10b981', title: 'Staff & Reporting',      desc: 'Run your team and your numbers with confidence.',        items: ['Sales & revenue reports', 'Tech performance tracking', 'Commission auto-calculation', 'PIN-based time clock', 'Payroll-ready hour exports', 'Live shop display board (TV)'] },
            ].map(s => (
              <div key={s.title} className="card-hover" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: s.color + '25', border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <s.icon style={{ width: 22, height: 22, color: s.color }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>{s.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {s.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                      <div style={{ width: 15, height: 15, borderRadius: '50%', background: s.color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckIcon style={{ width: 8, height: 8, color: s.color }} />
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

      {/* ── Carriers ─────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '56px 24px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28 }}>Supports activations & tracking for</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {carriers.map(c => (
              <div key={c} style={{ padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: LGRAY, border: '1px solid #e2e8f0', color: '#334155' }}>{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section style={{ background: LGRAY, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#fef9c3', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Customer Stories</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.5px' }}>Trusted by shop owners like you</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {testimonials.map(t => (
              <div key={t.name} className="card-hover" style={{ background: t.featured ? `linear-gradient(135deg, ${t.color}10, ${t.color}05)` : '#fff', borderRadius: 16, padding: '28px', border: t.featured ? `2px solid ${t.color}44` : '1px solid #e2e8f0', boxShadow: t.featured ? `0 8px 32px ${t.color}18` : '0 1px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
                {t.featured && (
                  <div style={{ position: 'absolute', top: -11, left: 24, background: t.color, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Verified Customer</div>
                )}
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: '#f59e0b', fontSize: 16 }}>★</span>)}
                </div>
                <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{t.initials}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#dbeafe', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pricing</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: SLATE }}>No contracts. No hidden fees. Cancel anytime.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {plans.map(p => (
              <div key={p.name} className="card-hover" style={{ background: '#fff', borderRadius: 18, padding: '36px 30px', border: p.badge ? `2px solid ${p.color}` : '1px solid #e2e8f0', boxShadow: p.badge ? `0 8px 40px ${p.color}22` : '0 1px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
                {p.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 999, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                    {p.badge}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 28 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: NAVY, lineHeight: 1 }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: SLATE, paddingBottom: 8 }}>/month</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#334155' }}>
                      <CheckIcon style={{ width: 16, height: 16, color: p.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" style={{ display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: p.badge ? p.color : LGRAY, color: p.badge ? '#fff' : NAVY, textDecoration: 'none' }}>
                  Try Free for 30 Days
                </Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#94a3b8' }}>
            All plans include a <strong style={{ color: '#64748b' }}>30-day free trial</strong> · No credit card required · Cancel anytime
          </p>
          <p style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/pricing" style={{ fontSize: 14, color: TEAL, textDecoration: 'none', fontWeight: 600 }}>See full feature comparison →</Link>
          </p>
        </div>
      </section>

      {/* ── Integrations ─────────────────────────────────────────── */}
      <section style={{ background: '#020617', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 999, padding: '5px 16px', marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Integrations</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.5px' }}>Works with tools you already use</h2>
            <p style={{ fontSize: 16, color: '#64748b', margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>CellTechPOS connects with leading payment, accounting, and communication platforms out of the box.</p>
          </div>

          {/* Integration cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { name: 'Stripe', desc: 'Card payments', color: '#635bff', emoji: '💳' },
              { name: 'Twilio', desc: 'SMS notifications', color: '#f22f46', emoji: '📱' },
              { name: 'SendGrid', desc: 'Email delivery', color: '#1a82e2', emoji: '✉️' },
              { name: 'PayPal', desc: 'Online payments', color: '#003087', emoji: '🅿️' },
              { name: 'QuickBooks', desc: 'Accounting export', color: '#2ca01c', emoji: '📊' },
              { name: 'ePay', desc: 'Carrier top-ups', color: '#0ea5e9', emoji: '📶' },
              { name: 'Google', desc: 'Reviews & maps', color: '#4285f4', emoji: '📍' },
            ].map(intg => (
              <div key={intg.name} className="card-hover" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 14px', textAlign: 'center', cursor: 'default' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${intg.color}22`, border: `1px solid ${intg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 10px' }}>{intg.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{intg.name}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{intg.desc}</div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 36, fontSize: 13, color: '#334155' }}>
            More integrations shipping regularly · <a href="/contact" style={{ color: '#2dd4bf', textDecoration: 'none' }}>Request a connection →</a>
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section style={{ background: LGRAY, padding: '80px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: '#e0f2fe', borderRadius: 999, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', letterSpacing: '0.06em', textTransform: 'uppercase' }}>FAQ</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: NAVY, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Common questions</h2>
            <p style={{ fontSize: 16, color: SLATE }}>Everything you need to know before getting started.</p>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '4px 28px 8px' }}>
            {faqs.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA / Contact ────────────────────────────────────────── */}
      <section id="contact" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0d2030 100%)`, padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Get Started Today</span>
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>Ready to modernize your store?</h2>
          <p style={{ fontSize: 17, color: '#94a3b8', margin: '0 0 40px', lineHeight: 1.7 }}>We'll set up your account and have your team live within 24 hours. Reach out and let's get started.</p>

          {/* Contact cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
            <Link to="/contact" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(45,212,191,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✉️</div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Send a Message</div>
              <div style={{ fontSize: 13, color: '#2dd4bf', fontWeight: 600 }}>Contact form →</div>
            </Link>
            <Link to="/signup" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(45,212,191,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚀</div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Start Free Trial</div>
              <div style={{ fontSize: 13, color: '#2dd4bf', fontWeight: 600 }}>30 days free, no card →</div>
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 36, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['⚡ Same-day setup', '🔒 Secure & encrypted', '💬 Ongoing support'].map(item => (
              <span key={item} style={{ fontSize: 13, color: '#475569' }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{ background: '#020617', padding: '52px 24px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 44 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${TEAL}, #0f766e)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DevicePhoneMobileIcon style={{ width: 17, height: 17, color: '#fff' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>CellTechPOS</span>
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>The complete POS platform for wireless & repair retailers.</p>
            </div>
            {[
              { title: 'Solutions', links: [['Point of Sale', '#features'], ['Repair Management', '#solutions'], ['Activations', '#solutions'], ['Inventory', '#solutions'], ['Customer CRM', '#solutions']] },
              { title: 'Company', links: [['Pricing', '/pricing'], ['Features', '#features'], ['Contact Us', '/contact'], ['Privacy Policy', '/privacy'], ['Terms', '/terms']] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{col.title}</div>
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} style={{ display: 'block', fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 10 }}
                    onMouseEnter={e => e.target.style.color='#94a3b8'} onMouseLeave={e => e.target.style.color='#64748b'}>{label}</a>
                ))}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Contact</div>
              <a href="mailto:support@celltechpos.com" style={{ display: 'block', fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 10 }}>support@celltechpos.com</a>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: TEAL, textDecoration: 'none', fontWeight: 600 }}>
                Customer Login <ArrowRightIcon style={{ width: 13, height: 13 }} />
              </Link>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>© {new Date().getFullYear()} PC World Exchange LLC. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link to="/privacy" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link to="/terms" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
