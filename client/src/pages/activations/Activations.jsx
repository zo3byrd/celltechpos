import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon, Cog6ToothIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { CARRIER_BRANDS, DEFAULT_ACT_PLANS } from '../../data/carrierPlans';

const CARRIERS = ['boost','tmobile','att','cricket','metro','verizon','visible','h2o','tracfone','simple','ultra','straighttalk','mint','other'];
const ACT_TYPES = ['new','upgrade','port','plan_change','swap'];
const STATUSES  = ['pending','submitted','approved','rejected','cancelled'];

const STATUS_BADGE = {
  pending:'badge-yellow', submitted:'badge-blue', approved:'badge-green',
  rejected:'badge-red', cancelled:'badge-gray',
};

const CARRIER_BRAND = Object.fromEntries(
  Object.entries(CARRIER_BRANDS).map(([k, v]) => [k, { bg: v.bg, text: v.text, abbr: v.abbr }])
);

const CARRIER_NAMES = Object.fromEntries(Object.entries(CARRIER_BRANDS).map(([k, v]) => [k, v.name]));

const LOGO_COLORS = ['#6b7280','#ef4444','#f97316','#eab308','#22c55e','#0ea5e9','#6366f1','#ec4899','#14b8a6','#8b5cf6'];
const PLANS_KEY = 'ctp_act_plans';

function mergeDefaultPlans(stored) {
  const merged = { ...stored };
  for (const [key, plans] of Object.entries(DEFAULT_ACT_PLANS)) {
    if (!merged[key]) merged[key] = plans;
  }
  return merged;
}

function makeAbbr(name) {
  if (!name) return 'OTH';
  const words = name.trim().split(/\s+/);
  return (words.length === 1 ? name.slice(0, 4) : words.map(w => w[0]).join('').slice(0, 4)).toUpperCase();
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

const emptyForm = {
  customerId:'', carrier:'boost', activationType:'new', planName:'', planCost:'',
  phoneNumber:'', imei:'', simNumber:'', commissionAmount:'', spiffAmount:'',
  useEpay: false, useVidapay: false, notes:'', otherName:'', otherColor:'#6b7280',
};

export default function Activations() {
  const [activations, setActivations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [carrier, setCarrier] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [epayPlans, setEpayPlans] = useState([]);
  const [form, setForm] = useState(emptyForm);

  // Plans
  const [plans, setPlans] = useState(() => { try { return mergeDefaultPlans(JSON.parse(localStorage.getItem(PLANS_KEY) || '{}')); } catch { return mergeDefaultPlans({}); } });
  const [addingPlan, setAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', cost: '', commission: '', spiff: '' });
  const [showPlansManager, setShowPlansManager] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); }, [plans]);

  function carrierKey() {
    return form.carrier === 'other' ? (form.otherName.trim() || 'other') : form.carrier;
  }

  function addPlan() {
    if (!newPlan.name.trim()) return toast.error('Plan name required');
    const entry = {
      id: Date.now().toString(),
      name: newPlan.name.trim(),
      cost: newPlan.cost || '',
      commission: newPlan.commission || '',
      spiff: newPlan.spiff || '',
    };
    const key = carrierKey();
    setPlans(prev => ({ ...prev, [key]: [...(prev[key] || []), entry] }));
    setNewPlan({ name: '', cost: '', commission: '', spiff: '' });
    setAddingPlan(false);
    toast.success('Plan saved');
  }

  function removePlan(key, id) {
    setPlans(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== id) }));
    if (selectedPlanId === id) setSelectedPlanId(null);
  }

  function selectPlan(plan) {
    setSelectedPlanId(plan.id);
    setForm(f => ({ ...f, planName: plan.name, planCost: plan.cost, commissionAmount: plan.commission, spiffAmount: plan.spiff }));
  }

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 20 });
    if (carrier) p.set('carrier', carrier);
    if (status)  p.set('status', status);
    if (search)  p.set('search', search);
    api.get(`/activations?${p}`)
      .then(r => { setActivations(r.data.activations); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, carrier, status, search]);
  useEffect(() => { api.get('/customers?limit=100').then(r => setCustomers(r.data.customers)); }, []);

  async function loadEpayPlans(c) {
    try {
      const plans = await api.get(`/activations/integrations/vidapay-plans?carrier=${c}`);
      setEpayPlans(plans.data.plans || []);
    } catch { setEpayPlans([]); }
  }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function submit() {
    try {
      const payload = { ...form };
      if (form.carrier === 'other' && form.otherName.trim()) payload.carrier = form.otherName.trim();
      await api.post('/activations', payload);
      toast.success('Activation submitted');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  async function updateStatus(id, s) {
    await api.put(`/activations/${id}`, { status: s });
    toast.success('Status updated');
    load();
  }

  const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activations</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowPlansManager(true)}>
            <Cog6ToothIcon className="w-4 h-4" /> Manage Plans
          </button>
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setSelectedPlanId(null); setAddingPlan(false); setModal(true); }}>
            <PlusIcon className="w-4 h-4" /> New Activation
          </button>
        </div>
      </div>

      {/* Carrier quick-select */}
      <div className="card py-3">
        <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wide">Quick New Activation by Carrier</p>
        <div className="flex flex-wrap gap-2">
          {CARRIERS.map(c => (
            <button key={c}
              onClick={() => { setForm({ ...emptyForm, carrier: c }); setSelectedPlanId(null); setAddingPlan(false); loadEpayPlans(c); setModal(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-white hover:border-green-600 hover:bg-green-50 transition-colors text-sm font-semibold text-gray-700">
              <CarrierLogo carrier={c} size="sm" />
              {CARRIER_NAMES[c] || c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Phone, IMEI, activation #…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-36" value={carrier} onChange={e => { setCarrier(e.target.value); setPage(1); }}>
          <option value="">All Carriers</option>
          {CARRIERS.map(c => <option key={c} value={c}>{CARRIER_NAMES[c] || c}</option>)}
        </select>
        <select className="input w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>{['#','Customer','Carrier','Type','Plan','Phone #','IMEI','Commission','Status',''].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={10}><div className="h-4 m-3 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : activations.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="table-td font-mono text-xs text-brand-600">{a.activationNumber}</td>
                <td className="table-td">{a.Customer ? `${a.Customer.firstName} ${a.Customer.lastName}` : '—'}</td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <CarrierLogo carrier={CARRIER_BRAND[a.carrier] ? a.carrier : 'other'} size="sm" customName={CARRIER_BRAND[a.carrier] ? undefined : a.carrier} />
                    <span className="capitalize">{a.carrier}</span>
                  </div>
                </td>
                <td className="table-td capitalize">{a.activationType?.replace('_', ' ')}</td>
                <td className="table-td">{a.planName || '—'}</td>
                <td className="table-td font-mono text-xs">{a.phoneNumber || '—'}</td>
                <td className="table-td font-mono text-xs">{a.imei || '—'}</td>
                <td className="table-td">{fmt$(a.commissionAmount)} + {fmt$(a.spiffAmount)} spiff</td>
                <td className="table-td"><span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                <td className="table-td">
                  {a.status === 'submitted' && (
                    <div className="flex gap-1">
                      <button className="text-xs text-green-600 hover:underline" onClick={() => updateStatus(a.id, 'approved')}>Approve</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => updateStatus(a.id, 'rejected')}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── New Activation Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="font-semibold">New Activation</h2>
              <button onClick={() => setModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-3">

                <div className="col-span-2">
                  <label className="label">Customer</label>
                  <select className="input" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
                    <option value="">— Select Customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} · {c.phone}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Carrier</label>
                  <div className="flex items-center gap-2">
                    <CarrierLogo carrier={form.carrier} size="md" customName={form.otherName} customColor={form.otherColor} />
                    <select className="input flex-1" value={form.carrier} onChange={e => { setForm(f => ({ ...f, carrier: e.target.value, otherName: '', otherColor: '#6b7280' })); setSelectedPlanId(null); setAddingPlan(false); loadEpayPlans(e.target.value); }}>
                      {CARRIERS.map(c => <option key={c} value={c}>{CARRIER_NAMES[c] || c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.activationType} onChange={e => set('activationType', e.target.value)}>
                    {ACT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>

                {/* Custom carrier — only when "Other" selected */}
                {form.carrier === 'other' && (
                  <div className="col-span-2 space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="label">Carrier Name <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-2">
                        <CarrierLogo carrier="other" size="md" customName={form.otherName} customColor={form.otherColor} />
                        <input className="input flex-1" placeholder="e.g. Simple Mobile, Ultra Mobile…"
                          value={form.otherName} onChange={e => setForm(f => ({ ...f, otherName: e.target.value }))} autoFocus />
                      </div>
                    </div>
                    <div>
                      <label className="label">Logo Color</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {LOGO_COLORS.map(c => (
                          <button key={c} type="button" onClick={() => setForm(f => ({ ...f, otherColor: c }))}
                            style={{ width: 28, height: 28, borderRadius: 6, background: c, flexShrink: 0,
                              border: form.otherColor === c ? '3px solid white' : '2px solid transparent',
                              boxShadow: form.otherColor === c ? `0 0 0 2px ${c}` : 'none' }} />
                        ))}
                        <input type="color" value={form.otherColor} onChange={e => setForm(f => ({ ...f, otherColor: e.target.value }))}
                          title="Custom color" style={{ width: 28, height: 28, borderRadius: 6, padding: 2, border: '1px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }} />
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
                        <button type="button" onClick={() => { setAddingPlan(true); setNewPlan({ name: '', cost: '', commission: '', spiff: '' }); }}
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
                                {plan.cost && <span className="opacity-70">— {fmt$(plan.cost)}</span>}
                                {plan.commission && <span className="opacity-50 text-xs"> +{fmt$(plan.commission)}</span>}
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
                          <input className="input text-sm" placeholder="Plan name (e.g. Boost Unlimited $25)"
                            value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} autoFocus />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="label text-xs">Plan Cost ($)</label>
                              <input type="number" className="input text-sm" placeholder="0.00" min="0" step="0.01"
                                value={newPlan.cost} onChange={e => setNewPlan(p => ({ ...p, cost: e.target.value }))} />
                            </div>
                            <div>
                              <label className="label text-xs">Commission ($)</label>
                              <input type="number" className="input text-sm" placeholder="0.00" min="0" step="0.01"
                                value={newPlan.commission} onChange={e => setNewPlan(p => ({ ...p, commission: e.target.value }))} />
                            </div>
                            <div>
                              <label className="label text-xs">Spiff ($)</label>
                              <input type="number" className="input text-sm" placeholder="0.00" min="0" step="0.01"
                                value={newPlan.spiff} onChange={e => setNewPlan(p => ({ ...p, spiff: e.target.value }))} />
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
                  <label className="label">Plan Name</label>
                  {epayPlans.length > 0 ? (
                    <select className="input" value={form.planName} onChange={e => { const p = epayPlans.find(x => x.name === e.target.value); set('planName', e.target.value); if (p) set('planCost', p.cost); }}>
                      <option value="">— Select Plan —</option>
                      {epayPlans.map(p => <option key={p.id} value={p.name}>{p.name} (${p.cost})</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.planName} onChange={e => set('planName', e.target.value)} placeholder="Plan name…" />
                  )}
                </div>
                <div>
                  <label className="label">Plan Cost ($)</label>
                  <input type="number" className="input" value={form.planCost} onChange={e => set('planCost', e.target.value)} step="0.01" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input font-mono" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} placeholder="(713) 555-0000" />
                </div>
                <div>
                  <label className="label">IMEI</label>
                  <input className="input font-mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="15-digit IMEI" />
                </div>
                <div>
                  <label className="label">SIM Number</label>
                  <input className="input font-mono" value={form.simNumber} onChange={e => set('simNumber', e.target.value)} />
                </div>
                <div>
                  <label className="label">Commission ($)</label>
                  <input type="number" className="input" value={form.commissionAmount} onChange={e => set('commissionAmount', e.target.value)} step="0.01" />
                </div>
                <div>
                  <label className="label">Spiff ($)</label>
                  <input type="number" className="input" value={form.spiffAmount} onChange={e => set('spiffAmount', e.target.value)} step="0.01" />
                </div>
                <div className="col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.useEpay} onChange={e => set('useEpay', e.target.checked)} className="rounded" />
                    Submit via <strong>Epay</strong>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.useVidapay} onChange={e => set('useVidapay', e.target.checked)} className="rounded" />
                    Submit via <strong>Vidapay</strong>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit}>Submit Activation</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Plans Modal ── */}
      {showPlansManager && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPlansManager(false)}>
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2 className="font-semibold">Manage Activation Plans</h2>
              <button onClick={() => setShowPlansManager(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body space-y-4">
              {Object.keys(plans).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No plans saved yet. Open a new activation and use "Add Plan" to create reusable plans per carrier.</p>
              )}
              {Object.entries(plans).map(([key, carrierPlans]) => carrierPlans.length === 0 ? null : (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <CarrierLogo carrier={CARRIER_BRAND[key] ? key : 'other'} size="sm" customName={CARRIER_BRAND[key] ? undefined : key} />
                    <span className="font-semibold text-sm text-slate-700">{CARRIER_NAMES[key] || key}</span>
                    <span className="text-xs text-slate-400">({carrierPlans.length} plan{carrierPlans.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-1 pl-8">
                    {carrierPlans.map(plan => (
                      <div key={plan.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg text-sm">
                        <span className="font-medium text-slate-700">{plan.name}</span>
                        <div className="flex items-center gap-3 text-slate-500 text-xs">
                          {plan.cost && <span>{fmt$(plan.cost)}/mo</span>}
                          {plan.commission && <span className="text-green-600">+{fmt$(plan.commission)} comm</span>}
                          {plan.spiff && <span className="text-blue-600">+{fmt$(plan.spiff)} spiff</span>}
                          <button onClick={() => removePlan(key, plan.id)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
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
