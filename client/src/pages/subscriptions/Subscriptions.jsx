import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CreditCardIcon, PlusIcon, XMarkIcon, CheckIcon,
  StarIcon, ArrowPathIcon, UserGroupIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUS_COLORS = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-500',
  expired:   'bg-red-100 text-red-600',
};
const INTERVALS = ['weekly', 'monthly', 'yearly'];
const PAYMENT_METHODS = ['cash', 'card', 'check', 'other'];

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

// ── Plan store card ────────────────────────────────────────────────────────────
function PlanCard({ plan, activeSubs, onEdit, onSubscribe }) {
  const features = (plan.features || '').split('\n').filter(Boolean);
  const isPopular = plan.interval === 'monthly' && parseFloat(plan.price) >= 15 && parseFloat(plan.price) <= 25;

  return (
    <div className="relative bg-white border-2 rounded-xl flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
      style={{ borderColor: isPopular ? plan.color : '#e5e7eb' }}>
      {isPopular && (
        <div className="absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1"
          style={{ background: plan.color }}>
          <StarIcon className="w-3 h-3" /> Popular
        </div>
      )}

      {/* Color accent bar */}
      <div className="h-1.5 w-full" style={{ background: plan.color }} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-base">{plan.name}</h3>
          {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
        </div>

        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">{fmt$(plan.price)}</span>
          <span className="text-sm text-gray-400 ml-1">/ {plan.interval}</span>
          {plan.interval === 'yearly' && (
            <div className="text-xs text-green-700 font-semibold mt-0.5">
              {fmt$(parseFloat(plan.price) / 12)}/mo — save vs monthly
            </div>
          )}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-1.5 mb-5 flex-1">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                {f}
              </li>
            ))}
          </ul>
        )}

        {/* Active count + actions */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <UserGroupIcon className="w-3.5 h-3.5" />
            {activeSubs} active
          </span>
          <div className="flex gap-2">
            <button onClick={() => onEdit(plan)}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1">
              Edit
            </button>
            <button onClick={() => onSubscribe(plan)}
              className="text-xs text-white font-semibold rounded px-3 py-1 hover:opacity-90"
              style={{ background: plan.color }}>
              + Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Subscriptions() {
  const [tab, setTab]               = useState('store');
  const [subs, setSubs]             = useState([]);
  const [plans, setPlans]           = useState([]);
  const [totalSubs, setTotalSubs]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [customers, setCustomers]   = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');

  async function loadPlans() {
    const { data } = await api.get('/subscriptions/plans');
    setPlans(data);
  }

  async function loadSubs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/subscriptions?${params}`);
      setSubs(data.subscriptions || []);
      setTotalSubs(data.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPlans(); loadSubs(); }, [filterStatus]);

  useEffect(() => {
    if (!custSearch || selectedCust) return setCustomers([]);
    const t = setTimeout(async () => {
      const { data } = await api.get(`/customers?search=${custSearch}&limit=8`);
      setCustomers(data.customers || []);
    }, 250);
    return () => clearTimeout(t);
  }, [custSearch, selectedCust]);

  async function savePlan() {
    if (!form.name || !form.price) return toast.error('Name and price required');
    setSaving(true);
    try {
      if (form.id) await api.put(`/subscriptions/plans/${form.id}`, form);
      else await api.post('/subscriptions/plans', form);
      toast.success('Plan saved');
      setModal(null);
      loadPlans();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function createSub() {
    if (!form.customerId || !form.planId) return toast.error('Customer and plan required');
    setSaving(true);
    try {
      await api.post('/subscriptions', form);
      toast.success('Subscription created');
      setModal(null);
      setSelectedCust(null);
      setCustSearch('');
      loadSubs();
      setTab('subscribers');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function renew(id) {
    try {
      await api.post(`/subscriptions/${id}/renew`);
      toast.success('Renewed');
      loadSubs();
    } catch { toast.error('Failed'); }
  }

  async function cancel(id) {
    const reason = prompt('Cancellation reason (optional):');
    if (reason === null) return;
    try {
      await api.put(`/subscriptions/${id}/cancel`, { reason });
      toast.success('Cancelled');
      loadSubs();
    } catch { toast.error('Failed'); }
  }

  function openSubscribe(plan) {
    setForm({ planId: plan.id, paymentMethod: 'cash', price: plan.price });
    setSelectedCust(null);
    setCustSearch('');
    setCustomers([]);
    setModal('new');
  }

  const activeSubs = subs.filter(s => s.status === 'active');
  const mrr = activeSubs.reduce((sum, s) => {
    const p = s.SubscriptionPlan;
    if (!p) return sum + parseFloat(s.price || 0);
    if (p.interval === 'weekly')  return sum + parseFloat(s.price || 0) * 4.33;
    if (p.interval === 'yearly')  return sum + parseFloat(s.price || 0) / 12;
    return sum + parseFloat(s.price || 0);
  }, 0);

  const dueIn7 = subs.filter(s =>
    s.status === 'active' && s.nextBillingDate &&
    new Date(s.nextBillingDate) <= new Date(Date.now() + 7 * 86400000)
  ).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-sub">Recurring service plans and memberships</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { setForm({ interval: 'monthly', color: '#0284c7' }); setModal('plan'); }}>
            <PlusIcon className="w-4 h-4" /> New Plan
          </button>
          <button className="btn-primary" onClick={() => { setForm({ paymentMethod: 'cash' }); setSelectedCust(null); setCustSearch(''); setCustomers([]); setModal('new'); }}>
            <PlusIcon className="w-4 h-4" /> New Subscription
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-2xl font-bold text-emerald-600">{fmt$(mrr)}</div>
          <div className="text-sm text-slate-500">Monthly Recurring Revenue</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-gray-900">{activeSubs.length}</div>
          <div className="text-sm text-slate-500">Active Subscribers</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-gray-900">{plans.length}</div>
          <div className="text-sm text-slate-500">Plans Available</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-amber-500">{dueIn7}</div>
          <div className="text-sm text-slate-500">Due for Renewal (7 days)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'store',       label: 'Plan Store',   icon: CreditCardIcon },
          { key: 'subscribers', label: 'Subscribers',  icon: UserGroupIcon },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── PLAN STORE TAB ── */}
      {tab === 'store' && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="card text-center py-12">
              <CreditCardIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No plans yet</p>
              <p className="text-gray-400 text-sm mb-4">Create your first subscription plan to get started</p>
              <button className="btn-primary mx-auto" onClick={() => { setForm({ interval: 'monthly', color: '#0284c7' }); setModal('plan'); }}>
                <PlusIcon className="w-4 h-4" /> Create First Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {plans.map(p => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  activeSubs={subs.filter(s => s.planId === p.id && s.status === 'active').length}
                  onEdit={plan => { setForm(plan); setModal('plan'); }}
                  onSubscribe={openSubscribe}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUBSCRIBERS TAB ── */}
      {tab === 'subscribers' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {[
              { value: 'active',    label: 'Active' },
              { value: 'paused',    label: 'Paused' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: '',          label: 'All' },
            ].map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === s.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading…</div>
            ) : subs.length === 0 ? (
              <div className="p-10 text-center">
                <UserGroupIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No subscribers yet</p>
                <p className="text-slate-400 text-sm">Go to Plan Store to sign up a customer</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-gray-50">
                    <th className="table-th">Customer</th>
                    <th className="table-th">Plan</th>
                    <th className="table-th">Price</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Start Date</th>
                    <th className="table-th">Next Billing</th>
                    <th className="table-th">Renewals</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id} className="table-row border-b border-gray-50 hover:bg-gray-50">
                      <td className="table-td">
                        <div className="font-medium text-gray-900">{s.Customer?.firstName} {s.Customer?.lastName}</div>
                        <div className="text-xs text-slate-400">{s.Customer?.phone}</div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: plans.find(p => p.id === s.planId)?.color || '#ccc' }} />
                          {s.SubscriptionPlan?.name || '—'}
                        </div>
                        <div className="text-xs text-gray-400">{s.SubscriptionPlan?.interval}</div>
                      </td>
                      <td className="table-td font-semibold text-gray-900">{fmt$(s.price)}</td>
                      <td className="table-td">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="table-td text-sm text-gray-500">{fmtDate(s.startDate)}</td>
                      <td className="table-td">
                        <span className={`text-sm ${
                          s.nextBillingDate && new Date(s.nextBillingDate) <= new Date(Date.now() + 7 * 86400000)
                            ? 'text-amber-600 font-semibold'
                            : 'text-gray-500'
                        }`}>
                          {fmtDate(s.nextBillingDate)}
                        </span>
                      </td>
                      <td className="table-td text-center text-gray-500">{s.renewalCount}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          {s.status === 'active' && (
                            <>
                              <button className="text-xs text-green-700 font-medium hover:underline flex items-center gap-0.5"
                                onClick={() => renew(s.id)}>
                                <ArrowPathIcon className="w-3 h-3" /> Renew
                              </button>
                              <button className="text-xs text-red-500 hover:underline" onClick={() => cancel(s.id)}>Cancel</button>
                            </>
                          )}
                          {s.status === 'cancelled' && <span className="text-xs text-gray-400">Cancelled</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Plan Modal ── */}
      {modal === 'plan' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-semibold">{form.id ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="label">Plan Name *</label>
                <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Basic Protection Plan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price *</label>
                  <input type="number" className="input" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">Interval</label>
                  <select className="input" value={form.interval || 'monthly'} onChange={e => setForm(f => ({ ...f, interval: e.target.value }))}>
                    {INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Features (one per line)</label>
                <textarea className="input" rows={4} value={form.features || ''} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                  placeholder={"Priority support\nFree diagnostics\n10% off repairs"} />
              </div>
              <div>
                <label className="label">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="h-9 w-16 rounded-lg border border-slate-200 cursor-pointer" value={form.color || '#0284c7'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                  <span className="text-sm text-gray-500">{form.color || '#0284c7'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={savePlan} disabled={saving}>{saving ? 'Saving…' : 'Save Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Subscription Modal ── */}
      {modal === 'new' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-semibold">New Subscription</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body space-y-4">
              {/* Customer search */}
              <div>
                <label className="label">Customer *</label>
                {selectedCust ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="font-semibold text-green-800 text-sm flex-1">{selectedCust.firstName} {selectedCust.lastName}</span>
                    <button onClick={() => { setSelectedCust(null); setCustSearch(''); setForm(f => ({ ...f, customerId: null })); }}
                      className="text-green-400 hover:text-red-500">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input className="input mb-1" placeholder="Search by name or phone…" value={custSearch}
                      onChange={e => setCustSearch(e.target.value)} />
                    {customers.length > 0 && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        {customers.map(c => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-green-50 border-b last:border-0 text-sm"
                            onClick={() => {
                              setSelectedCust(c);
                              setForm(f => ({ ...f, customerId: c.id }));
                              setCustSearch('');
                              setCustomers([]);
                            }}>
                            <span className="font-medium">{c.firstName} {c.lastName}</span>
                            <span className="text-gray-400 text-xs ml-2">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Plan select */}
              <div>
                <label className="label">Plan *</label>
                <select className="input" value={form.planId || ''} onChange={e => {
                  const plan = plans.find(p => p.id === e.target.value);
                  setForm(f => ({ ...f, planId: e.target.value, price: plan?.price }));
                }}>
                  <option value="">— Select plan —</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} · {fmt$(p.price)}/{p.interval}</option>)}
                </select>
              </div>

              {/* Plan preview */}
              {form.planId && (() => {
                const plan = plans.find(p => p.id === form.planId);
                if (!plan) return null;
                const features = (plan.features || '').split('\n').filter(Boolean);
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm" style={{ color: plan.color }}>{plan.name}</span>
                      <span className="font-bold text-gray-900">{fmt$(plan.price)}/{plan.interval}</span>
                    </div>
                    {features.map((f, i) => (
                      <div key={i} className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckIcon className="w-3 h-3 text-green-500" />{f}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={form.paymentMethod || 'cash'} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input" value={form.startDate || ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>

              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={createSub} disabled={saving}>
                {saving ? 'Creating…' : `Create Subscription${form.planId ? ' · ' + fmt$(plans.find(p => p.id === form.planId)?.price || 0) : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
