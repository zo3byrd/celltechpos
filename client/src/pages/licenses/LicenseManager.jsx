import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon, XMarkIcon, PlusIcon, ArrowPathIcon,
  NoSymbolIcon, CheckCircleIcon, ExclamationTriangleIcon,
  MagnifyingGlassIcon, ChevronRightIcon, UserGroupIcon,
  BuildingStorefrontIcon, CurrencyDollarIcon, ChartBarIcon,
  LinkIcon, PencilIcon, CreditCardIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const centsToDisplay = cents => (cents / 100).toFixed(2);
const dollarsToCents = d => Math.round(parseFloat(d) * 100);

function StatusBadge({ status, daysLeft }) {
  if (status === 'active' && daysLeft !== null && daysLeft <= 14)
    return <span className="badge badge-yellow">Expiring ({daysLeft}d)</span>;
  const map = { active:'badge-green', trial:'badge-blue', expired:'badge-red', suspended:'badge-orange', cancelled:'badge-gray' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

function StripeStatus({ status }) {
  if (!status) return null;
  const map = { active:'badge-green', trialing:'badge-blue', past_due:'badge-orange', cancelled:'badge-gray', unpaid:'badge-red' };
  return <span className={`badge ${map[status] || 'badge-gray'} ml-1`}>stripe:{status}</span>;
}

function PayPalStatus({ status }) {
  if (!status || status === 'APPROVAL_PENDING') return null;
  const map = { ACTIVE:'badge-green', SUSPENDED:'badge-orange', CANCELLED:'badge-gray', EXPIRED:'badge-red' };
  return <span className={`badge ${map[status] || 'badge-gray'} ml-1`}>paypal:{status.toLowerCase()}</span>;
}

const extendFormDefault = { months: '', years: '', price: '' };
const onboardDefault = {
  storeName:'', storeEmail:'', storePhone:'', storeAddress:'', storeCity:'', storeState:'', storeZip:'',
  adminName:'', adminEmail:'', adminPassword:'', stripePlanKey:'', notes:'',
};

export default function LicenseManager() {
  const [licenses, setLicenses]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [plans, setPlans]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [tab, setTab]             = useState('stores'); // 'stores' | 'pricing'
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [detailLoading, setDL]    = useState(false);
  const [extForm, setExtForm]     = useState(extendFormDefault);
  const [onboard, setOnboard]     = useState(onboardDefault);
  const [editPlan, setEditPlan]   = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [payLinkLic, setPayLinkLic]   = useState(null);
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: lics }, { data: s }, { data: p }] = await Promise.all([
        api.get('/licenses'),
        api.get('/licenses/stats/revenue'),
        api.get('/licenses/stripe-plans'),
      ]);
      setLicenses(lics);
      setStats(s);
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
    } catch { toast.error('Failed to load store details'); }
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
    if (!window.confirm(`Cancel license for ${lic.storeName}? This also cancels their Stripe subscription.`)) return;
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
      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        setModal('checkout');
      } else {
        toast.success(`${onboard.storeName} onboarded!`);
        setModal(null);
      }
      setOnboard(onboardDefault); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  function getPaymentLink(lic, e) {
    e.stopPropagation();
    setPayLinkLic(lic);
    setSelected(lic);
    setModal('payMethod');
  }

  async function generateStripeLink(lic) {
    setSaving(true);
    try {
      const { data } = await api.post(`/licenses/${lic.storeId}/payment-link`, { stripePlanKey: lic.stripePlanKey });
      setCheckoutUrl(data.checkoutUrl);
      setModal('checkout');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function generatePayPalLink(lic) {
    setSaving(true);
    try {
      const { data } = await api.post(`/licenses/${lic.storeId}/paypal-link`, { stripePlanKey: lic.stripePlanKey });
      setCheckoutUrl(data.approvalUrl);
      setModal('checkout');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function savePlanPrice() {
    if (!editPlan.amount || parseFloat(editPlan.amount) < 1) return toast.error('Enter a valid price');
    setSaving(true);
    try {
      await api.put(`/licenses/stripe-plans/${editPlan.key}`, {
        amount: dollarsToCents(editPlan.amount),
        label: editPlan.label,
      });
      toast.success('Price updated in Stripe');
      setModal(null); setEditPlan(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  const filtered = licenses.filter(l => {
    const matchSearch = !search ||
      l.storeName?.toLowerCase().includes(search.toLowerCase()) ||
      l.storeEmail?.toLowerCase().includes(search.toLowerCase()) ||
      l.storeCity?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6 text-green-700" />Subscription Dashboard
          </h1>
          <p className="page-sub">Manage all store licenses — superadmin only</p>
        </div>
        <button className="btn-primary" onClick={() => { setOnboard(onboardDefault); setModal('onboard'); }}>
          <PlusIcon className="w-4 h-4" />Onboard New Store
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<BuildingStorefrontIcon className="w-5 h-5"/>} label="Active Stores" value={stats.activeStores} accent="green" />
          <StatCard icon={<CurrencyDollarIcon className="w-5 h-5"/>} label="MRR" value={fmt$(stats.mrr)} accent="green" />
          <StatCard icon={<ChartBarIcon className="w-5 h-5"/>} label="ARR" value={fmt$(stats.arr)} accent="blue" />
          <StatCard icon={<ExclamationTriangleIcon className="w-5 h-5"/>} label="Expired / Suspended" value={`${stats.expired} / ${stats.suspended}`} accent={stats.expired > 0 ? 'red' : 'gray'} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[['stores','Stores'], ['pricing','Plans & Pricing']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── STORES TAB ── */}
      {tab === 'stores' && (
        <>
          {stats && (
            <div className="flex flex-wrap gap-3">
              {[
                { label:'Monthly', count:stats.monthly, color:'bg-blue-50 text-blue-700 border-blue-200' },
                { label:'Yearly',  count:stats.yearly,  color:'bg-green-50 text-green-700 border-green-200' },
                { label:'Trial',   count:stats.trial,   color:'bg-amber-50 text-amber-700 border-amber-200' },
              ].map(p => (
                <div key={p.label} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-semibold ${p.color}`}>
                  <span className="text-lg font-bold">{p.count}</span> {p.label}
                </div>
              ))}
              <div className="ml-auto text-sm text-gray-400 self-center">{stats.totalStores} total</div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Search store name, email, city…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-40" value={filterStatus} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">All Stores</span>
              <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 animate-pulse">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                {licenses.length === 0 ? 'No stores yet — click "Onboard New Store" to add one' : 'No stores match your search'}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Store</th>
                    <th className="table-th">Plan</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Expires</th>
                    <th className="table-th">Price</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lic => (
                    <tr key={lic.id} className="table-row cursor-pointer hover:bg-green-50/30" onClick={() => openDetail(lic)}>
                      <td className="table-td">
                        <div className="font-semibold text-gray-800">{lic.storeName}</div>
                        <div className="text-xs text-gray-400">{lic.storeEmail}</div>
                        {lic.storeCity && <div className="text-xs text-gray-400">{lic.storeCity}{lic.storeState ? `, ${lic.storeState}` : ''}</div>}
                      </td>
                      <td className="table-td capitalize text-sm">{lic.stripePlanKey?.replace('_', ' ') || lic.plan}</td>
                      <td className="table-td">
                        <StatusBadge status={lic.status} daysLeft={lic.daysLeft} />
                        <StripeStatus status={lic.stripeStatus} />
                        <PayPalStatus status={lic.paypalStatus} />
                      </td>
                      <td className="table-td">
                        <div className="text-sm">{fmtDate(lic.expiresAt)}</div>
                        {lic.daysLeft !== null && lic.status === 'active' && (
                          <div className={`text-xs font-semibold ${lic.daysLeft <= 14 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {lic.daysLeft > 0 ? `${lic.daysLeft}d left` : 'Expired'}
                          </div>
                        )}
                      </td>
                      <td className="table-td">{lic.price > 0 ? fmt$(lic.price) + '/mo' : <span className="text-gray-400">—</span>}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={e => getPaymentLink(lic, e)} title="Get payment link" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <LinkIcon className="w-4 h-4" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setSelected(lic); setExtForm(extendFormDefault); setModal('extend'); }}
                            title="Extend" className="p-1 text-green-700 hover:bg-green-50 rounded">
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                          <button onClick={e => toggleSuspend(lic, e)}
                            title={lic.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            className={`p-1 rounded ${lic.status === 'suspended' ? 'text-green-700 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}>
                            {lic.status === 'suspended' ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
                          </button>
                          <button onClick={e => cancelLicense(lic, e)} title="Cancel" className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <NoSymbolIcon className="w-4 h-4" />
                          </button>
                          <ChevronRightIcon className="w-4 h-4 text-gray-300 ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── PRICING TAB ── */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            Changing a price creates a new Stripe price. Existing subscribers keep their current price until their next renewal.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.key} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{plan.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{plan.interval === 'month' ? 'Monthly' : 'Annual'} · {plan.key}</div>
                  {plan.stripePriceId && <div className="text-xs text-gray-300 font-mono mt-0.5">{plan.stripePriceId}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold text-gray-800">${centsToDisplay(plan.amount)}</div>
                  <button onClick={() => { setEditPlan({ ...plan, amount: centsToDisplay(plan.amount) }); setModal('editPrice'); }}
                    className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {plans.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-10">
              Plans will appear here once Stripe products are created on server startup.
              <br />Make sure <code className="text-xs bg-gray-100 px-1 rounded">STRIPE_SECRET_KEY</code> is set.
            </div>
          )}
        </div>
      )}

      {/* ── Payment Method Picker Modal ── */}
      {modal === 'payMethod' && payLinkLic && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><LinkIcon className="w-5 h-5 text-green-700" />Payment Link</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-gray-600">Choose payment processor for <strong>{payLinkLic.storeName}</strong>:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={saving}
                  onClick={() => generateStripeLink(payLinkLic)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 hover:border-blue-500 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50">
                  <CreditCardIcon className="w-8 h-8 text-blue-600" />
                  <span className="font-bold text-blue-700 text-sm">Stripe</span>
                  <span className="text-xs text-blue-500">Credit / Debit card</span>
                </button>
                <button
                  disabled={saving}
                  onClick={() => generatePayPalLink(payLinkLic)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-yellow-200 hover:border-yellow-500 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors disabled:opacity-50">
                  <span className="text-2xl">🅿</span>
                  <span className="font-bold text-yellow-700 text-sm">PayPal</span>
                  <span className="text-xs text-yellow-600">PayPal balance / card</span>
                </button>
              </div>
              {saving && <p className="text-xs text-center text-gray-400 animate-pulse">Generating link…</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboard Modal ── */}
      {modal === 'onboard' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800">Onboard New Store</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Store Info</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="label">Store Name *</label><input className="input" value={onboard.storeName} onChange={e=>setOnboard(f=>({...f,storeName:e.target.value}))} placeholder="My Wireless Houston" /></div>
                  <div><label className="label">Store Email</label><input type="email" className="input" value={onboard.storeEmail} onChange={e=>setOnboard(f=>({...f,storeEmail:e.target.value}))} placeholder="store@example.com" /></div>
                  <div><label className="label">Store Phone</label><input className="input" value={onboard.storePhone} onChange={e=>setOnboard(f=>({...f,storePhone:e.target.value}))} placeholder="(713) 555-0100" /></div>
                  <div className="col-span-2"><label className="label">Address</label><input className="input" value={onboard.storeAddress} onChange={e=>setOnboard(f=>({...f,storeAddress:e.target.value}))} placeholder="123 Main St" /></div>
                  <div><label className="label">City</label><input className="input" value={onboard.storeCity} onChange={e=>setOnboard(f=>({...f,storeCity:e.target.value}))} placeholder="Houston" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="label">State</label><input className="input" value={onboard.storeState} onChange={e=>setOnboard(f=>({...f,storeState:e.target.value}))} placeholder="TX" maxLength={2} /></div>
                    <div><label className="label">ZIP</label><input className="input" value={onboard.storeZip} onChange={e=>setOnboard(f=>({...f,storeZip:e.target.value}))} placeholder="77001" /></div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Admin Login</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Admin Name</label><input className="input" value={onboard.adminName} onChange={e=>setOnboard(f=>({...f,adminName:e.target.value}))} placeholder="Store Owner" /></div>
                  <div><label className="label">Admin Email *</label><input type="email" className="input" value={onboard.adminEmail} onChange={e=>setOnboard(f=>({...f,adminEmail:e.target.value}))} placeholder="owner@example.com" /></div>
                  <div className="col-span-2"><label className="label">Password *</label><input type="password" className="input" value={onboard.adminPassword} onChange={e=>setOnboard(f=>({...f,adminPassword:e.target.value}))} placeholder="Temporary password" /></div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Stripe Plan</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label">Plan</label>
                    <select className="input" value={onboard.stripePlanKey} onChange={e=>setOnboard(f=>({...f,stripePlanKey:e.target.value}))}>
                      <option value="">— No Stripe billing (manual) —</option>
                      {plans.filter(p=>p.active).map(p => (
                        <option key={p.key} value={p.key}>{p.label} — ${centsToDisplay(p.amount)}/{p.interval === 'month' ? 'mo' : 'yr'}</option>
                      ))}
                    </select>
                    {onboard.stripePlanKey && <p className="text-xs text-green-700 mt-1">A Stripe checkout link will be generated — share it with the store owner to collect their card.</p>}
                  </div>
                  <div className="col-span-2"><label className="label">Notes</label><input className="input" value={onboard.notes} onChange={e=>setOnboard(f=>({...f,notes:e.target.value}))} placeholder="Optional notes" /></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitOnboard} disabled={saving}>{saving ? 'Creating…' : 'Create Store & License'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Link Modal ── */}
      {modal === 'checkout' && checkoutUrl && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><CreditCardIcon className="w-5 h-5 text-green-700" />Payment Link Ready</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-gray-600">Share this link with <strong>{selected?.storeName || 'the store'}</strong>. They'll complete payment and the license activates automatically.</p>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 flex items-center gap-2">
                <input className="input flex-1 text-xs font-mono bg-transparent border-0 p-0 focus:ring-0" readOnly value={checkoutUrl} />
                <button className="btn-primary text-xs px-3 py-1.5" onClick={() => { navigator.clipboard.writeText(checkoutUrl); toast.success('Copied!'); }}>
                  Copy
                </button>
              </div>
              <a href={checkoutUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <LinkIcon className="w-3.5 h-3.5" /> Open link
              </a>
              <p className="text-xs text-gray-400">The license activates automatically via webhook after payment. Stripe links include a 14-day trial.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extend Modal ── */}
      {modal === 'extend' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800">Extend — {selected.storeName}</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body">
              <p className="text-xs text-gray-500 mb-3">Current expiry: <strong>{fmtDate(selected.expiresAt)}</strong></p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">+ Months</label><input type="number" className="input" value={extForm.months} onChange={e=>setExtForm(f=>({...f,months:e.target.value,years:''}))} min="1" max="24" placeholder="1" /></div>
                <div><label className="label">+ Years</label><input type="number" className="input" value={extForm.years} onChange={e=>setExtForm(f=>({...f,years:e.target.value,months:''}))} min="1" max="5" placeholder="1" /></div>
                <div className="col-span-2"><label className="label">Price Paid ($)</label><input type="number" className="input" value={extForm.price} onChange={e=>setExtForm(f=>({...f,price:e.target.value}))} placeholder="Optional" min="0" /></div>
              </div>
              {(extForm.months || extForm.years) && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                  New expiry: <strong>{(() => {
                    const base = selected.expiresAt && new Date(selected.expiresAt) > new Date() ? new Date(selected.expiresAt) : new Date();
                    if (extForm.months) base.setMonth(base.getMonth() + parseInt(extForm.months));
                    if (extForm.years)  base.setFullYear(base.getFullYear() + parseInt(extForm.years));
                    return base.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  })()}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={extendLicense} disabled={saving}>{saving ? 'Extending…' : 'Extend License'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Price Modal ── */}
      {modal === 'editPrice' && editPlan && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800">Edit Price — {editPlan.label}</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="label">Plan Label</label>
                <input className="input" value={editPlan.label} onChange={e=>setEditPlan(f=>({...f,label:e.target.value}))} />
              </div>
              <div>
                <label className="label">Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                  <input type="number" className="input pl-7" value={editPlan.amount} onChange={e=>setEditPlan(f=>({...f,amount:e.target.value}))} min="1" step="0.01" placeholder="99.00" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Billing {editPlan.interval === 'month' ? 'monthly' : 'annually'}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-700">
                This creates a new Stripe price. New subscriptions use the new price. Existing subscribers keep their current price.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={savePlanPrice} disabled={saving}>{saving ? 'Saving…' : 'Update Price'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Store Detail Modal ── */}
      {modal === 'detail' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><BuildingStorefrontIcon className="w-5 h-5 text-green-700" />{selected.storeName}</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-3"><div className="text-xs text-gray-500 mb-1">Status</div><StatusBadge status={selected.status} daysLeft={selected.daysLeft} /><StripeStatus status={selected.stripeStatus} /><PayPalStatus status={selected.paypalStatus} /></div>
                <div className="bg-gray-50 rounded p-3"><div className="text-xs text-gray-500 mb-1">Plan</div><div className="font-semibold capitalize">{selected.stripePlanKey?.replace('_',' ') || selected.plan}</div></div>
                <div className="bg-gray-50 rounded p-3"><div className="text-xs text-gray-500 mb-1">Expires</div><div className={`font-semibold ${selected.daysLeft <= 14 ? 'text-amber-600' : ''}`}>{fmtDate(selected.expiresAt)}</div></div>
                <div className="bg-gray-50 rounded p-3"><div className="text-xs text-gray-500 mb-1">Price</div><div className="font-semibold">{selected.price > 0 ? fmt$(selected.price) + '/period' : '—'}</div></div>
                {selected.stripeCustomerId && <div className="col-span-2 bg-gray-50 rounded p-3"><div className="text-xs text-gray-500 mb-1">Stripe Customer</div><div className="font-mono text-xs text-gray-600">{selected.stripeCustomerId}</div></div>}
                {selected.stripeSubscriptionId && <div className="col-span-2 bg-gray-50 rounded p-3"><div className="text-xs text-gray-500 mb-1">Stripe Subscription</div><div className="font-mono text-xs text-gray-600">{selected.stripeSubscriptionId}</div></div>}
              </div>
              {detailLoading ? <div className="text-center text-gray-400 py-4 animate-pulse">Loading…</div> : detail ? (
                <>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Usage</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[{label:'Repairs',value:detail.stats?.repairs||0},{label:'Customers',value:detail.stats?.customers||0},{label:'Transactions',value:detail.stats?.transactions||0}].map(s=>(
                        <div key={s.label} className="bg-gray-50 rounded p-2 text-center"><div className="text-lg font-bold text-gray-800">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><UserGroupIcon className="w-3.5 h-3.5" />Staff ({detail.users?.length||0})</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detail.users?.map(u=>(
                        <div key={u.id} className="flex items-center justify-between text-sm px-2 py-1.5 bg-gray-50 rounded">
                          <div><span className="font-semibold">{u.name}</span><span className="text-gray-400 ml-2 text-xs">{u.email}</span></div>
                          <span className="badge badge-gray text-xs">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Close</button>
              <button className="btn-outline text-sm" onClick={e => getPaymentLink(selected, e)}><LinkIcon className="w-4 h-4" />Payment Link</button>
              <button className="btn-primary" onClick={() => { setExtForm(extendFormDefault); setModal('extend'); }}><ArrowPathIcon className="w-4 h-4" />Extend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  const cls = { green:'text-green-700', blue:'text-blue-700', red:'text-red-600', gray:'text-gray-700' }[accent] || 'text-gray-700';
  return (
    <div className="card flex items-start gap-3">
      <div className={`mt-0.5 ${cls}`}>{icon}</div>
      <div><div className={`text-2xl font-bold ${cls}`}>{value}</div><div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-0.5">{label}</div></div>
    </div>
  );
}
