import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const CARRIERS = ['boost','tmobile','att','verizon','metro','cricket','visible','other'];
const ACT_TYPES = ['new','upgrade','port','plan_change','swap'];
const STATUSES  = ['pending','submitted','approved','rejected','cancelled'];

const STATUS_BADGE = {
  pending:'badge-yellow', submitted:'badge-blue', approved:'badge-green',
  rejected:'badge-red', cancelled:'badge-gray',
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
  const [form, setForm] = useState({
    customerId:'', carrier:'boost', activationType:'new', planName:'', planCost:'',
    phoneNumber:'', imei:'', simNumber:'', commissionAmount:'', spiffAmount:'',
    useEpay: false, useVidapay: false, notes:'',
  });

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 20 });
    if (carrier) p.set('carrier', carrier);
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    api.get(`/activations?${p}`)
      .then(r => { setActivations(r.data.activations); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, carrier, status, search]);
  useEffect(() => { api.get('/customers?limit=100').then(r => setCustomers(r.data.customers)); }, []);

  async function loadEpayPlans(c) {
    const { data } = await api.get(`/activations/integrations/epay-balance`);
    const plans = await api.get(`/activations/integrations/vidapay-plans?carrier=${c}`);
    setEpayPlans(plans.data.plans || []);
  }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function submit() {
    try {
      await api.post('/activations', form);
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activations</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ customerId:'', carrier:'boost', activationType:'new', planName:'', planCost:'', phoneNumber:'', imei:'', simNumber:'', commissionAmount:'', spiffAmount:'', useEpay:false, useVidapay:false, notes:'' }); setModal(true); }}>
          + New Activation
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Phone, IMEI, activation #…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-36" value={carrier} onChange={e => { setCarrier(e.target.value); setPage(1); }}>
          <option value="">All Carriers</option>
          {CARRIERS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
                <td className="table-td capitalize">{a.carrier}</td>
                <td className="table-td capitalize">{a.activationType?.replace('_', ' ')}</td>
                <td className="table-td">{a.planName || '—'}</td>
                <td className="table-td font-mono text-xs">{a.phoneNumber || '—'}</td>
                <td className="table-td font-mono text-xs">{a.imei || '—'}</td>
                <td className="table-td">${parseFloat(a.commissionAmount || 0).toFixed(2)} + ${parseFloat(a.spiffAmount || 0).toFixed(2)} spiff</td>
                <td className="table-td"><span className={STATUS_BADGE[a.status] || 'badge-gray'}>{a.status}</span></td>
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

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">New Activation</h2>
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
                <select className="input" value={form.carrier} onChange={e => { set('carrier', e.target.value); loadEpayPlans(e.target.value); }}>
                  {CARRIERS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.activationType} onChange={e => set('activationType', e.target.value)}>
                  {ACT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
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
            <div className="flex gap-3">
              <button className="btn-primary" onClick={submit}>Submit Activation</button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
