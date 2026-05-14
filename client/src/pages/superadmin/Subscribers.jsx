import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  XMarkIcon, PlusIcon, ArrowPathIcon, NoSymbolIcon,
  CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
  ChevronRightIcon, UserGroupIcon, BuildingStorefrontIcon,
  LinkIcon, BanknotesIcon, CreditCardIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '—';
const centsToDisplay = c => (c / 100).toFixed(2);
const ZELLE_EMAIL = 'Pcworldexchange@gmail.com';

function Badge({ label, color }) {
  const map = {
    green:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80',  border: 'rgba(34,197,94,0.25)' },
    blue:   { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8',  border: 'rgba(99,102,241,0.25)' },
    amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24',  border: 'rgba(245,158,11,0.25)' },
    red:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171',  border: 'rgba(239,68,68,0.25)' },
    gray:   { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af',  border: 'rgba(107,114,128,0.25)' },
  };
  const c = map[color] || map.gray;
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {label}
    </span>
  );
}

function StatusBadge({ status, daysLeft }) {
  if (status === 'active' && daysLeft !== null && daysLeft <= 14)
    return <Badge label={`Expiring (${daysLeft}d)`} color="amber" />;
  const map = { active:'green', trial:'blue', expired:'red', suspended:'amber', cancelled:'gray' };
  return <Badge label={status} color={map[status] || 'gray'} />;
}

function PayBadge({ prefix, status, colorMap }) {
  if (!status) return null;
  const map = colorMap || { active:'green', trialing:'blue', past_due:'amber', cancelled:'gray', ACTIVE:'green', SUSPENDED:'amber', CANCELLED:'gray' };
  return <Badge label={`${prefix}:${status.toLowerCase()}`} color={map[status] || 'gray'} />;
}

const onboardDefault = {
  storeName:'', storeEmail:'', storePhone:'', storeAddress:'', storeCity:'', storeState:'', storeZip:'',
  adminName:'', adminEmail:'', adminPassword:'', stripePlanKey:'', notes:'',
};
const extDefault = { months:'', years:'', price:'' };

export default function Subscribers() {
  const [licenses, setLicenses]   = useState([]);
  const [plans, setPlans]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDL]    = useState(false);
  const [extForm, setExtForm]     = useState(extDefault);
  const [onboard, setOnboard]     = useState(onboardDefault);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [payLinkLic, setPayLinkLic]   = useState(null);
  const [markPaidForm, setMarkPaidForm] = useState({ price:'', period:'month', note:'' });
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: lics }, { data: p }] = await Promise.all([
        api.get('/licenses'),
        api.get('/licenses/stripe-plans'),
      ]);
      const now = new Date();
      setLicenses(lics.map(l => ({
        ...l,
        daysLeft: l.expiresAt ? Math.ceil((new Date(l.expiresAt) - now) / 86400000) : null,
      })));
      setPlans(p);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function openDetail(lic) {
    setSelected(lic); setDetail(null); setModal('detail'); setDL(true);
    try {
      const { data } = await api.get(`/licenses/${lic.storeId}/details`);
      setDetail(data);
    } catch { toast.error('Failed to load details'); }
    finally { setDL(false); }
  }

  async function extendLicense() {
    if (!extForm.months && !extForm.years) return toast.error('Enter months or years');
    setSaving(true);
    try {
      await api.post(`/licenses/${selected.storeId}/extend`, extForm);
      toast.success('License extended'); setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function toggleSuspend(lic, e) {
    e.stopPropagation();
    try {
      await api.post(`/licenses/${lic.storeId}/suspend`);
      toast.success(lic.status === 'suspended' ? 'Reactivated' : 'Suspended'); load();
    } catch { toast.error('Failed'); }
  }

  async function cancelLicense(lic, e) {
    e.stopPropagation();
    if (!window.confirm(`Cancel license for ${lic.storeName}?`)) return;
    try {
      await api.post(`/licenses/${lic.storeId}/cancel-stripe`);
      toast.success('Cancelled'); load();
    } catch { toast.error('Failed'); }
  }

  async function submitOnboard() {
    if (!onboard.storeName || !onboard.adminEmail || !onboard.adminPassword)
      return toast.error('Store name, admin email, and password are required');
    setSaving(true);
    try {
      const { data } = await api.post('/licenses/onboard', onboard);
      if (data.checkoutUrl) { setCheckoutUrl(data.checkoutUrl); setModal('checkout'); }
      else { toast.success(`${onboard.storeName} onboarded!`); setModal(null); }
      setOnboard(onboardDefault); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  function openPayMethod(lic, e) {
    e.stopPropagation(); setPayLinkLic(lic); setSelected(lic); setModal('payMethod');
  }

  async function generateStripeLink(lic) {
    setSaving(true);
    try {
      const { data } = await api.post(`/licenses/${lic.storeId}/payment-link`, { stripePlanKey: lic.stripePlanKey });
      setCheckoutUrl(data.checkoutUrl); setModal('checkout');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function generatePayPalLink(lic) {
    setSaving(true);
    try {
      const { data } = await api.post(`/licenses/${lic.storeId}/paypal-link`, { stripePlanKey: lic.stripePlanKey });
      setCheckoutUrl(data.approvalUrl); setModal('checkout');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  function openMarkPaid(lic, note = '') {
    setSelected(lic);
    setMarkPaidForm({ price: lic.price > 0 ? parseFloat(lic.price).toFixed(2) : '', period: lic.plan === 'yearly' ? 'year' : 'month', note });
    setModal('markPaid');
  }

  async function submitMarkPaid() {
    if (!markPaidForm.price) return toast.error('Enter the amount received');
    setSaving(true);
    try {
      await api.post(`/licenses/${selected.storeId}/mark-paid`, markPaidForm);
      toast.success('License marked as paid'); setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  const filtered = licenses.filter(l => {
    const matchSearch = !search ||
      l.storeName?.toLowerCase().includes(search.toLowerCase()) ||
      l.storeEmail?.toLowerCase().includes(search.toLowerCase()) ||
      l.storeCity?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterStatus === 'all' || l.status === filterStatus);
  });

  // shared input style
  const inp = { background:'#1a1f35', border:'1px solid #2a2f50', color:'white', borderRadius:'0.5rem', padding:'0.5rem 0.75rem', width:'100%', outline:'none', fontSize:'0.875rem' };
  const lbl = { display:'block', fontSize:'0.75rem', fontWeight:600, color:'#9ca3af', marginBottom:'0.25rem', textTransform:'uppercase', letterSpacing:'0.05em' };
  const closeBtn = () => setModal(null);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscribers</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Manage all stores using CellTechPOS</p>
        </div>
        <button onClick={() => { setOnboard(onboardDefault); setModal('onboard'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <PlusIcon className="w-4 h-4" />Onboard New Store
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'#4b5563' }} />
          <input style={{ ...inp, paddingLeft:'2.25rem' }} placeholder="Search store, email, city…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inp, width:'160px' }} value={filterStatus} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #1e2240' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid #1e2240' }}>
          <span className="text-sm font-bold text-white">All Stores</span>
          <span className="text-xs" style={{ color:'#4b5563' }}>{filtered.length} store{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center animate-pulse" style={{ color:'#374151' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center" style={{ color:'#4b5563' }}>
            {licenses.length === 0 ? 'No stores yet — click "Onboard New Store" to add one' : 'No stores match your search'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid #1e2240' }}>
                {['Store','Plan','Status','Expires','Price','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color:'#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lic, i) => (
                <tr key={lic.id} onClick={() => openDetail(lic)} className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #1a1f35' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white text-sm">{lic.storeName}</div>
                    <div className="text-xs mt-0.5" style={{ color:'#4b5563' }}>{lic.storeEmail}</div>
                    {lic.storeCity && <div className="text-xs" style={{ color:'#374151' }}>{lic.storeCity}{lic.storeState ? `, ${lic.storeState}` : ''}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize" style={{ color:'#9ca3af' }}>
                    {lic.stripePlanKey?.replace(/_/g,' ') || lic.plan}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={lic.status} daysLeft={lic.daysLeft} />
                      {lic.stripeStatus && <PayBadge prefix="stripe" status={lic.stripeStatus} />}
                      {lic.paypalStatus && lic.paypalStatus !== 'APPROVAL_PENDING' && <PayBadge prefix="paypal" status={lic.paypalStatus} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm" style={{ color:'#9ca3af' }}>{fmtDate(lic.expiresAt)}</div>
                    {lic.daysLeft !== null && lic.status === 'active' && (
                      <div className="text-xs font-semibold mt-0.5" style={{ color: lic.daysLeft <= 14 ? '#fbbf24' : '#374151' }}>
                        {lic.daysLeft > 0 ? `${lic.daysLeft}d left` : 'Expired'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: lic.price > 0 ? '#a5b4fc' : '#374151' }}>
                    {lic.price > 0 ? fmt$(lic.price) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <ActionBtn icon={<LinkIcon />} label="Payment link" color="#6366f1" onClick={e => openPayMethod(lic, e)} />
                      <ActionBtn icon={<BanknotesIcon />} label="Mark paid" color="#10b981" onClick={e => { e.stopPropagation(); openMarkPaid(lic); }} />
                      <ActionBtn icon={<ArrowPathIcon />} label="Extend" color="#0ea5e9" onClick={e => { e.stopPropagation(); setSelected(lic); setExtForm(extDefault); setModal('extend'); }} />
                      <ActionBtn
                        icon={lic.status === 'suspended' ? <CheckCircleIcon /> : <ExclamationTriangleIcon />}
                        label={lic.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        color={lic.status === 'suspended' ? '#10b981' : '#f59e0b'}
                        onClick={e => toggleSuspend(lic, e)} />
                      <ActionBtn icon={<NoSymbolIcon />} label="Cancel" color="#ef4444" onClick={e => cancelLicense(lic, e)} />
                      <ChevronRightIcon className="w-3.5 h-3.5 ml-1" style={{ color:'#1e2240' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Payment Method Modal ── */}
      {modal === 'payMethod' && payLinkLic && (
        <Modal title="Payment Link" icon={<LinkIcon className="w-5 h-5" style={{ color:'#6366f1' }} />} onClose={closeBtn}>
          <p className="text-sm mb-4" style={{ color:'#9ca3af' }}>Choose payment processor for <strong className="text-white">{payLinkLic.storeName}</strong>:</p>
          <div className="grid grid-cols-3 gap-3">
            <PayMethodBtn label="Stripe" sub="Credit / Debit" color="#6366f1" icon={<CreditCardIcon className="w-8 h-8" />} onClick={() => generateStripeLink(payLinkLic)} disabled={saving} />
            <PayMethodBtn label="PayPal" sub="PayPal / card" color="#f59e0b" icon={<span className="text-2xl">🅿</span>} onClick={() => generatePayPalLink(payLinkLic)} disabled={saving} />
            <PayMethodBtn label="Zelle" sub="Manual transfer" color="#8b5cf6" icon={<BanknotesIcon className="w-8 h-8" />} onClick={() => setModal('zelle')} disabled={saving} />
          </div>
          {saving && <p className="text-xs text-center mt-3 animate-pulse" style={{ color:'#4b5563' }}>Generating link…</p>}
          <ModalFooter><CancelBtn onClose={closeBtn} /></ModalFooter>
        </Modal>
      )}

      {/* ── Zelle Modal ── */}
      {modal === 'zelle' && payLinkLic && (
        <Modal title="Zelle Payment" icon={<BanknotesIcon className="w-5 h-5" style={{ color:'#8b5cf6' }} />} onClose={closeBtn}>
          <p className="text-sm mb-4" style={{ color:'#9ca3af' }}>Payment instructions for <strong className="text-white">{payLinkLic.storeName}</strong>:</p>
          <div className="rounded-xl p-4 space-y-3 mb-4" style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.25)' }}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color:'#8b5cf6' }}>Send Zelle to</div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(139,92,246,0.3)' }}>
                <span className="font-mono font-semibold text-white">{ZELLE_EMAIL}</span>
                <button className="text-xs font-semibold ml-3" style={{ color:'#a78bfa' }}
                  onClick={() => { navigator.clipboard.writeText(ZELLE_EMAIL); toast.success('Copied!'); }}>Copy</button>
              </div>
            </div>
            {payLinkLic.price > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color:'#8b5cf6' }}>Amount</div>
                <div className="text-xl font-bold text-white">{fmt$(payLinkLic.price)}<span className="text-sm font-normal ml-1" style={{ color:'#8b5cf6' }}>/{payLinkLic.plan === 'yearly' ? 'year' : 'month'}</span></div>
              </div>
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color:'#8b5cf6' }}>Memo</div>
              <div className="text-sm text-white">{payLinkLic.storeName} — CellTechPOS license</div>
            </div>
          </div>
          <div className="text-xs rounded-lg px-3 py-2.5 mb-1" style={{ background:'rgba(245,158,11,0.08)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.2)' }}>
            Once you receive the Zelle payment, click <strong>Mark as Paid</strong> to activate their license.
          </div>
          <ModalFooter>
            <CancelBtn onClose={closeBtn} />
            <PrimaryBtn onClick={() => openMarkPaid(payLinkLic, 'Zelle payment')} icon={<BanknotesIcon className="w-4 h-4" />} label="Mark as Paid" />
          </ModalFooter>
        </Modal>
      )}

      {/* ── Mark as Paid Modal ── */}
      {modal === 'markPaid' && selected && (
        <Modal title={`Mark as Paid — ${selected.storeName}`} icon={<BanknotesIcon className="w-5 h-5" style={{ color:'#10b981' }} />} onClose={closeBtn} size="sm">
          <p className="text-xs mb-4" style={{ color:'#6b7280' }}>Record a manual payment (Zelle, cash, check) and extend the license.</p>
          <FormField label="Amount Received">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" style={{ color:'#4b5563' }}>$</span>
              <input type="number" style={{ ...inp, paddingLeft:'1.75rem' }} value={markPaidForm.price}
                onChange={e => setMarkPaidForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.01" placeholder="49.00" />
            </div>
          </FormField>
          <FormField label="Extend By">
            <select style={inp} value={markPaidForm.period} onChange={e => setMarkPaidForm(f => ({ ...f, period: e.target.value }))}>
              <option value="month">1 Month</option>
              <option value="year">1 Year</option>
            </select>
          </FormField>
          <FormField label="Note (optional)">
            <input style={inp} value={markPaidForm.note} onChange={e => setMarkPaidForm(f => ({ ...f, note: e.target.value }))} placeholder="Zelle payment, cash, etc." />
          </FormField>
          {markPaidForm.price && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background:'rgba(16,185,129,0.08)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>
              Will extend by <strong>1 {markPaidForm.period}</strong> and set price to <strong>{fmt$(markPaidForm.price)}</strong>.
            </div>
          )}
          <ModalFooter>
            <CancelBtn onClose={closeBtn} />
            <PrimaryBtn onClick={submitMarkPaid} disabled={saving} label={saving ? 'Saving…' : 'Confirm Payment'} />
          </ModalFooter>
        </Modal>
      )}

      {/* ── Checkout Link Modal ── */}
      {modal === 'checkout' && checkoutUrl && (
        <Modal title="Payment Link Ready" icon={<CreditCardIcon className="w-5 h-5" style={{ color:'#6366f1' }} />} onClose={closeBtn} size="sm">
          <p className="text-sm mb-4" style={{ color:'#9ca3af' }}>Share this with <strong className="text-white">{selected?.storeName}</strong>. License activates automatically after payment.</p>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2" style={{ background:'rgba(0,0,0,0.3)', border:'1px solid #1e2240' }}>
            <input readOnly value={checkoutUrl} className="flex-1 text-xs font-mono bg-transparent outline-none text-white" />
            <button className="text-xs font-semibold px-3 py-1 rounded" style={{ background:'#6366f1', color:'white' }}
              onClick={() => { navigator.clipboard.writeText(checkoutUrl); toast.success('Copied!'); }}>Copy</button>
          </div>
          <a href={checkoutUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color:'#6366f1' }}>
            <LinkIcon className="w-3 h-3" />Open link
          </a>
          <ModalFooter><PrimaryBtn onClick={closeBtn} label="Done" /></ModalFooter>
        </Modal>
      )}

      {/* ── Extend Modal ── */}
      {modal === 'extend' && selected && (
        <Modal title={`Extend — ${selected.storeName}`} onClose={closeBtn} size="sm">
          <p className="text-xs mb-4" style={{ color:'#6b7280' }}>Current expiry: <strong className="text-white">{fmtDate(selected.expiresAt)}</strong></p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="+ Months">
              <input type="number" style={inp} value={extForm.months} onChange={e => setExtForm(f => ({ ...f, months:e.target.value, years:'' }))} min="1" max="24" placeholder="1" />
            </FormField>
            <FormField label="+ Years">
              <input type="number" style={inp} value={extForm.years} onChange={e => setExtForm(f => ({ ...f, years:e.target.value, months:'' }))} min="1" max="5" placeholder="1" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Price Paid ($)">
                <input type="number" style={inp} value={extForm.price} onChange={e => setExtForm(f => ({ ...f, price:e.target.value }))} placeholder="Optional" min="0" />
              </FormField>
            </div>
          </div>
          <ModalFooter>
            <CancelBtn onClose={closeBtn} />
            <PrimaryBtn onClick={extendLicense} disabled={saving} label={saving ? 'Extending…' : 'Extend License'} icon={<ArrowPathIcon className="w-4 h-4" />} />
          </ModalFooter>
        </Modal>
      )}

      {/* ── Detail Modal ── */}
      {modal === 'detail' && selected && (
        <Modal title={selected.storeName} icon={<BuildingStorefrontIcon className="w-5 h-5" style={{ color:'#6366f1' }} />} onClose={closeBtn}>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {[
              { label:'Status', value: <><StatusBadge status={selected.status} daysLeft={selected.daysLeft} />{selected.stripeStatus && <PayBadge prefix="stripe" status={selected.stripeStatus} />}</> },
              { label:'Plan', value: <span className="text-white capitalize">{selected.stripePlanKey?.replace(/_/g,' ') || selected.plan}</span> },
              { label:'Expires', value: <span className={selected.daysLeft <= 14 ? 'text-yellow-400' : 'text-white'}>{fmtDate(selected.expiresAt)}</span> },
              { label:'Price', value: <span className="text-white">{selected.price > 0 ? fmt$(selected.price) + '/period' : '—'}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e2240' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:'#4b5563' }}>{label}</div>
                {value}
              </div>
            ))}
            {selected.stripeCustomerId && (
              <div className="col-span-2 rounded-lg p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e2240' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color:'#4b5563' }}>Stripe Customer</div>
                <div className="font-mono text-xs" style={{ color:'#6366f1' }}>{selected.stripeCustomerId}</div>
              </div>
            )}
          </div>
          {detailLoading ? <div className="text-center py-6 animate-pulse" style={{ color:'#374151' }}>Loading…</div>
          : detail ? (
            <>
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:'#4b5563' }}>Usage</div>
                <div className="grid grid-cols-3 gap-2">
                  {[{label:'Repairs',value:detail.stats?.repairs||0},{label:'Customers',value:detail.stats?.customers||0},{label:'Transactions',value:detail.stats?.transactions||0}].map(s=>(
                    <div key={s.label} className="rounded-lg p-3 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid #1e2240' }}>
                      <div className="text-xl font-bold text-white">{s.value}</div>
                      <div className="text-xs mt-0.5" style={{ color:'#4b5563' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-2" style={{ color:'#4b5563' }}>
                  <UserGroupIcon className="w-3.5 h-3.5" />Staff ({detail.users?.length||0})
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {detail.users?.map(u=>(
                    <div key={u.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ background:'rgba(255,255,255,0.02)' }}>
                      <div><span className="font-semibold text-white">{u.name}</span><span className="ml-2 text-xs" style={{ color:'#4b5563' }}>{u.email}</span></div>
                      <Badge label={u.role} color="gray" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          <ModalFooter>
            <CancelBtn onClose={closeBtn} label="Close" />
            <SecondaryBtn onClick={e => openPayMethod(selected, e)} icon={<LinkIcon className="w-4 h-4" />} label="Payment Link" />
            <SecondaryBtn onClick={() => openMarkPaid(selected)} icon={<BanknotesIcon className="w-4 h-4" />} label="Mark Paid" color="#10b981" />
            <PrimaryBtn onClick={() => { setExtForm(extDefault); setModal('extend'); }} icon={<ArrowPathIcon className="w-4 h-4" />} label="Extend" />
          </ModalFooter>
        </Modal>
      )}

      {/* ── Onboard Modal ── */}
      {modal === 'onboard' && (
        <Modal title="Onboard New Store" icon={<PlusIcon className="w-5 h-5" style={{ color:'#6366f1' }} />} onClose={closeBtn} size="xl">
          <div className="space-y-5">
            <Section label="Store Info">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><FormField label="Store Name *"><input style={inp} value={onboard.storeName} onChange={e=>setOnboard(f=>({...f,storeName:e.target.value}))} placeholder="My Wireless Houston" /></FormField></div>
                <FormField label="Store Email"><input type="email" style={inp} value={onboard.storeEmail} onChange={e=>setOnboard(f=>({...f,storeEmail:e.target.value}))} placeholder="store@example.com" /></FormField>
                <FormField label="Store Phone"><input style={inp} value={onboard.storePhone} onChange={e=>setOnboard(f=>({...f,storePhone:e.target.value}))} placeholder="(713) 555-0100" /></FormField>
                <div className="col-span-2"><FormField label="Address"><input style={inp} value={onboard.storeAddress} onChange={e=>setOnboard(f=>({...f,storeAddress:e.target.value}))} placeholder="123 Main St" /></FormField></div>
                <FormField label="City"><input style={inp} value={onboard.storeCity} onChange={e=>setOnboard(f=>({...f,storeCity:e.target.value}))} placeholder="Houston" /></FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="State"><input style={inp} value={onboard.storeState} onChange={e=>setOnboard(f=>({...f,storeState:e.target.value}))} placeholder="TX" maxLength={2} /></FormField>
                  <FormField label="ZIP"><input style={inp} value={onboard.storeZip} onChange={e=>setOnboard(f=>({...f,storeZip:e.target.value}))} placeholder="77001" /></FormField>
                </div>
              </div>
            </Section>
            <Section label="Admin Login">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Admin Name"><input style={inp} value={onboard.adminName} onChange={e=>setOnboard(f=>({...f,adminName:e.target.value}))} placeholder="Store Owner" /></FormField>
                <FormField label="Admin Email *"><input type="email" style={inp} value={onboard.adminEmail} onChange={e=>setOnboard(f=>({...f,adminEmail:e.target.value}))} placeholder="owner@example.com" /></FormField>
                <div className="col-span-2"><FormField label="Temp Password *"><input type="password" style={inp} value={onboard.adminPassword} onChange={e=>setOnboard(f=>({...f,adminPassword:e.target.value}))} /></FormField></div>
              </div>
            </Section>
            <Section label="Subscription Plan">
              <FormField label="Plan">
                <select style={inp} value={onboard.stripePlanKey} onChange={e=>setOnboard(f=>({...f,stripePlanKey:e.target.value}))}>
                  <option value="">— Manual / No Stripe billing —</option>
                  {plans.filter(p=>p.active).map(p=>(
                    <option key={p.key} value={p.key}>{p.label} — ${centsToDisplay(p.amount)}/{p.interval==='month'?'mo':'yr'}</option>
                  ))}
                </select>
                {onboard.stripePlanKey && <p className="text-xs mt-1" style={{ color:'#818cf8' }}>A Stripe checkout link will be generated after onboarding.</p>}
              </FormField>
              <FormField label="Notes"><input style={inp} value={onboard.notes} onChange={e=>setOnboard(f=>({...f,notes:e.target.value}))} placeholder="Optional notes" /></FormField>
            </Section>
          </div>
          <ModalFooter>
            <CancelBtn onClose={closeBtn} />
            <PrimaryBtn onClick={submitOnboard} disabled={saving} label={saving ? 'Creating…' : 'Create Store & License'} />
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Modal({ title, icon, onClose, size = 'md', children }) {
  const widths = { sm:'420px', md:'580px', xl:'720px' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: widths[size], background:'#13162a', border:'1px solid #1e2240', boxShadow:'0 25px 50px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid #1e2240' }}>
          <h2 className="font-bold text-white flex items-center gap-2">{icon}{title}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }) {
  return <div className="flex items-center justify-end gap-2 mt-5 pt-4" style={{ borderTop:'1px solid #1e2240' }}>{children}</div>;
}

function CancelBtn({ onClose, label = 'Cancel' }) {
  return <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ background:'rgba(255,255,255,0.05)', color:'#9ca3af' }}>{label}</button>;
}

function PrimaryBtn({ onClick, disabled, label, icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
      style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
      {icon}{label}
    </button>
  );
}

function SecondaryBtn({ onClick, label, icon, color = '#6366f1' }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
      style={{ background: color + '18', color, border: `1px solid ${color}40` }}>
      {icon}{label}
    </button>
  );
}

function ActionBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} title={label}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color, background: color + '15' }}
      onMouseEnter={e => e.currentTarget.style.background = color + '30'}
      onMouseLeave={e => e.currentTarget.style.background = color + '15'}>
      <icon.type {...icon.props} className="w-3.5 h-3.5" />
    </button>
  );
}

function PayMethodBtn({ label, sub, color, icon, onClick, disabled }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all disabled:opacity-50"
      style={{ background: color + '15', border: `1px solid ${color}40`, color }}>
      {icon}
      <span className="font-bold text-sm text-white">{label}</span>
      <span className="text-xs" style={{ color: color + 'cc' }}>{sub}</span>
    </button>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#6b7280', marginBottom:'0.25rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5" style={{ color:'#6366f1', borderBottom:'1px solid rgba(99,102,241,0.2)' }}>{label}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
