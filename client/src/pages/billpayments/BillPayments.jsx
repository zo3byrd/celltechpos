import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BanknotesIcon, PlusIcon, XMarkIcon, Cog6ToothIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { CARRIER_BRANDS, DEFAULT_BP_PLANS } from '../../data/carrierPlans';

const PLANS_KEY = 'ctp_bp_plans';

const TYPES = ['prepaid_pin', 'bill_payment', 'mobile_topup', 'money_order'];
const PAYMENT_METHODS = ['cash', 'card', 'check', 'other'];

const CARRIERS = {
  boost: 'Boost Mobile', tmobile: 'T-Mobile', att: 'AT&T Prepaid',
  cricket: 'Cricket Wireless', metro: 'Metro by T-Mobile', verizon: 'Verizon Prepaid',
  visible: 'Visible', h2o: 'H2O Wireless', tracfone: 'Tracfone',
  simple: 'Simple Mobile', ultra: 'Ultra Mobile', straighttalk: 'Straight Talk',
  mint: 'Mint Mobile', other: 'Other',
};

const CARRIER_BRAND = Object.fromEntries(
  Object.entries(CARRIER_BRANDS).map(([k, v]) => [k, { bg: v.bg, text: v.text, abbr: v.abbr }])
);

function makeAbbr(name) {
  if (!name) return 'OTH';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 4).toUpperCase();
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
}

function CarrierLogo({ carrier, size = 'sm', customName, customColor }) {
  const [imgFailed, setImgFailed] = useState(false);
  const b = (carrier === 'other' && (customName || customColor))
    ? { bg: customColor || '#6b7280', text: '#fff', abbr: makeAbbr(customName) }
    : (CARRIER_BRAND[carrier] || { bg: '#6b7280', text: '#fff', abbr: makeAbbr(carrier) });
  const h = size === 'lg' ? 44 : size === 'md' ? 32 : 22;
  const hasLogo = carrier && carrier !== 'other' && !imgFailed;
  if (hasLogo) {
    return (
      <img src={`/carriers/${carrier}.svg`} alt={b.abbr}
        style={{ height: h, width: 'auto', borderRadius: 4, flexShrink: 0, display: 'block' }}
        onError={() => setImgFailed(true)} />
    );
  }
  const fs = size === 'lg' ? 11 : size === 'md' ? 9 : 8;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: h, height: h, borderRadius: 4, background: b.bg, color: b.text,
      fontSize: fs, fontWeight: 700, letterSpacing: '0.02em', flexShrink: 0 }}>
      {b.abbr}
    </span>
  );
}

const LOGO_COLORS = ['#6b7280','#ef4444','#f97316','#eab308','#22c55e','#0ea5e9','#6366f1','#ec4899','#14b8a6','#8b5cf6'];
const empty = { type: 'prepaid_pin', carrier: 'boost', amount: '', fee: '0', phoneNumber: '', pinCode: '', accountNumber: '', paymentMethod: 'cash', notes: '', otherName: '', otherColor: '#6b7280' };

function mergeDefaultPlans(stored) {
  const merged = { ...stored };
  for (const [key, plans] of Object.entries(DEFAULT_BP_PLANS)) {
    if (!merged[key]) merged[key] = plans;
  }
  return merged;
}

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function BillPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [plans, setPlans] = useState(() => { try { return mergeDefaultPlans(JSON.parse(localStorage.getItem(PLANS_KEY) || '{}')); } catch { return mergeDefaultPlans({}); } });
  const [addingPlan, setAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', amount: '', fee: '0' });
  const [showPlansManager, setShowPlansManager] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); }, [plans]);

  function carrierKey() {
    return form.carrier === 'other' ? (form.otherName.trim() || 'other') : form.carrier;
  }

  function addPlan() {
    if (!newPlan.name.trim()) return toast.error('Plan name required');
    if (!newPlan.amount || parseFloat(newPlan.amount) <= 0) return toast.error('Amount required');
    const key = carrierKey();
    const entry = { id: Date.now().toString(), name: newPlan.name.trim(), amount: newPlan.amount, fee: newPlan.fee || '0' };
    setPlans(prev => ({ ...prev, [key]: [...(prev[key] || []), entry] }));
    setNewPlan({ name: '', amount: '', fee: '0' });
    setAddingPlan(false);
    toast.success('Plan saved');
  }

  function removePlan(key, id) {
    setPlans(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== id) }));
    if (selectedPlanId === id) setSelectedPlanId(null);
  }

  function selectPlan(plan) {
    setSelectedPlanId(plan.id);
    setForm(f => ({ ...f, amount: plan.amount, fee: plan.fee || '0', notes: plan.name }));
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filterType) params.set('type', filterType);
      if (filterCarrier) params.set('carrier', filterCarrier);
      const { data } = await api.get(`/bill-payments?${params}`);
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterType, filterCarrier]);

  const totalAmt = (parseFloat(form.amount) || 0) + (parseFloat(form.fee) || 0);

  async function save() {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Amount required');
    if (form.carrier === 'other' && !form.otherName.trim()) return toast.error('Enter a carrier name');
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.carrier === 'other' && form.otherName.trim()) {
        payload.carrier = form.otherName.trim();
      }
      await api.post('/bill-payments', payload);
      toast.success('Payment recorded');
      setModal(false);
      setForm(empty);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  const todayTotal = payments
    .filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + parseFloat(p.total || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Bill Payments & Prepaid</h1>
          <p className="page-sub">Prepaid PIN sales, bill payments, mobile top-ups</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowPlansManager(true)}><Cog6ToothIcon className="w-4 h-4" />Manage Plans</button>
          <button className="btn-primary" onClick={() => { setForm(empty); setSelectedPlanId(null); setModal(true); }}><PlusIcon className="w-4 h-4" />New Payment</button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-2xl font-bold text-slate-900">{fmt$(todayTotal)}</div>
          <div className="text-sm text-slate-500">Today's total</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-slate-900">{payments.filter(p => p.type === 'prepaid_pin').length}</div>
          <div className="text-sm text-slate-500">Prepaid PINs today</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-sm text-slate-500">Total transactions</div>
        </div>
      </div>

      {/* Carrier quick-select */}
      <div className="card py-3">
        <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wide">Quick Process by Carrier</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CARRIERS).map(([key, name]) => (
            <button key={key}
              onClick={() => { setForm(f => ({ ...f, carrier: key, type: 'prepaid_pin' })); setModal(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-white hover:border-green-600 hover:bg-green-50 transition-colors text-sm font-semibold text-gray-700">
              <CarrierLogo carrier={key} size="sm" />
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <select className="input w-44 text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select className="input w-44 text-sm" value={filterCarrier} onChange={e => setFilterCarrier(e.target.value)}>
            <option value="">All carriers</option>
            {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : payments.length === 0 ? (
          <div className="p-10 text-center">
            <BanknotesIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No bill payments yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-th">Bill #</th>
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Carrier</th>
                <th className="table-th">Phone #</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Fee</th>
                <th className="table-th">Total</th>
                <th className="table-th">Payment</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-td font-mono text-xs">{p.billNumber}</td>
                  <td className="table-td">{fmtDate(p.createdAt)}</td>
                  <td className="table-td"><span className="badge-blue badge capitalize">{p.type?.replace('_', ' ')}</span></td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <CarrierLogo carrier={p.carrier} size="sm" />
                      <span>{CARRIERS[p.carrier] || p.carrier}</span>
                    </div>
                  </td>
                  <td className="table-td">{p.phoneNumber || '—'}</td>
                  <td className="table-td">{fmt$(p.amount)}</td>
                  <td className="table-td">{fmt$(p.fee)}</td>
                  <td className="table-td font-semibold">{fmt$(p.total)}</td>
                  <td className="table-td capitalize">{p.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold">Process Payment</h2>
              <button onClick={() => setModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Carrier</label>
                  <div className="flex items-center gap-2">
                    <CarrierLogo carrier={form.carrier} size="md" customName={form.otherName} customColor={form.otherColor} />
                    <select className="input flex-1" value={form.carrier} onChange={e => { setForm(f => ({ ...f, carrier: e.target.value, amount: '', otherName: '', otherColor: '#6b7280' })); setSelectedPlanId(null); setAddingPlan(false); }}>
                      {Object.entries(CARRIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>

                {/* Custom carrier fields — only when "Other" is selected */}
                {form.carrier === 'other' && (
                  <div className="col-span-2 space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="label">Carrier Name <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-2">
                        <CarrierLogo carrier="other" size="md" customName={form.otherName} customColor={form.otherColor} />
                        <input
                          className="input flex-1"
                          placeholder="e.g. Simple Mobile, Ultra Mobile…"
                          value={form.otherName}
                          onChange={e => setForm(f => ({ ...f, otherName: e.target.value }))}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Logo Color</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {LOGO_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, otherColor: c }))}
                            style={{
                              width: 28, height: 28, borderRadius: 6, background: c,
                              border: form.otherColor === c ? '3px solid white' : '2px solid transparent',
                              boxShadow: form.otherColor === c ? `0 0 0 2px ${c}` : 'none',
                              flexShrink: 0,
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={form.otherColor}
                          onChange={e => setForm(f => ({ ...f, otherColor: e.target.value }))}
                          title="Custom color"
                          style={{ width: 28, height: 28, borderRadius: 6, padding: 2, border: '1px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Saved Plans ── */}
                {(() => {
                  const key = form.carrier === 'other' ? (form.otherName.trim() || null) : form.carrier;
                  const carrierPlans = key ? (plans[key] || []) : [];
                  return (
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="label mb-0">Saved Plans</label>
                        <button type="button" onClick={() => { setAddingPlan(true); setNewPlan({ name: '', amount: '', fee: '0' }); }}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                          <PlusIcon className="w-3.5 h-3.5" /> Add Plan
                        </button>
                      </div>
                      {carrierPlans.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {carrierPlans.map(plan => (
                            <div key={plan.id} className="flex items-center gap-0.5">
                              <button type="button" onClick={() => selectPlan(plan)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg border text-sm font-medium transition-colors ${
                                  selectedPlanId === plan.id
                                    ? 'bg-brand-600 text-white border-brand-600'
                                    : 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50'
                                }`}>
                                {selectedPlanId === plan.id && <CheckIcon className="w-3.5 h-3.5" />}
                                {plan.name}
                                <span className="opacity-75">— {fmt$(plan.amount)}</span>
                                {parseFloat(plan.fee) > 0 && <span className="opacity-50 text-xs">+{fmt$(plan.fee)}</span>}
                              </button>
                              <button type="button" onClick={() => removePlan(key, plan.id)}
                                className="px-1.5 py-1.5 border border-l-0 border-slate-200 rounded-r-lg text-slate-300 hover:text-red-400 hover:border-red-200 transition-colors">
                                <XMarkIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {carrierPlans.length === 0 && !addingPlan && (
                        <p className="text-xs text-slate-400 mb-2">No plans saved for this carrier yet.</p>
                      )}
                      {addingPlan && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mb-2">
                          <input className="input text-sm" placeholder="Plan name (e.g. Unlimited $35, Family Plan)"
                            value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} autoFocus />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="label text-xs">Amount ($)</label>
                              <input type="number" className="input text-sm" placeholder="0.00" min="0" step="0.01"
                                value={newPlan.amount} onChange={e => setNewPlan(p => ({ ...p, amount: e.target.value }))} />
                            </div>
                            <div className="flex-1">
                              <label className="label text-xs">Fee ($)</label>
                              <input type="number" className="input text-sm" placeholder="0.00" min="0" step="0.25"
                                value={newPlan.fee} onChange={e => setNewPlan(p => ({ ...p, fee: e.target.value }))} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn-primary text-sm py-1.5 flex-1" onClick={addPlan}>Save Plan</button>
                            <button className="btn-secondary text-sm py-1.5" onClick={() => setAddingPlan(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="label">Amount ($)</label>
                  <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" step="0.01" />
                </div>
                <div>
                  <label className="label">Fee ($)</label>
                  <input type="number" className="input" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} min="0" step="0.25" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select className="input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {form.type === 'prepaid_pin' && (
                  <div className="col-span-2">
                    <label className="label">PIN Code (optional)</label>
                    <input className="input font-mono" value={form.pinCode} onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))} placeholder="Enter PIN if processing manually" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Amount</span><span>{fmt$(form.amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Fee</span><span>{fmt$(form.fee)}</span></div>
                <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2"><span>Total</span><span>{fmt$(totalAmt)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Processing…' : `Charge ${fmt$(totalAmt)}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Plans Modal ── */}
      {showPlansManager && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPlansManager(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="font-semibold">Manage Plans</h2>
              <button onClick={() => setShowPlansManager(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body space-y-4">
              {Object.keys(plans).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No plans saved yet. Open a payment and use "Add Plan" to create reusable plans per carrier.</p>
              )}
              {Object.entries(plans).map(([key, carrierPlans]) => carrierPlans.length === 0 ? null : (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <CarrierLogo carrier={CARRIER_BRAND[key] ? key : 'other'} size="sm" customName={CARRIER_BRAND[key] ? undefined : key} />
                    <span className="font-semibold text-sm text-slate-700">{CARRIERS[key] || key}</span>
                    <span className="text-xs text-slate-400">({carrierPlans.length} plan{carrierPlans.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-1 pl-8">
                    {carrierPlans.map(plan => (
                      <div key={plan.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg text-sm">
                        <span className="font-medium text-slate-700">{plan.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{fmt$(plan.amount)}{parseFloat(plan.fee) > 0 ? ` + ${fmt$(plan.fee)} fee` : ''}</span>
                          <button onClick={() => removePlan(key, plan.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPlansManager(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
