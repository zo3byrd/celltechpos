import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArchiveBoxIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUS_COLORS = { active: 'badge-blue', completed: 'badge-green', cancelled: 'badge-gray', forfeited: 'badge-red' };
const PAYMENT_METHODS = ['cash', 'card', 'check', 'other'];

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function Layaway() {
  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [filterStatus, setFilterStatus] = useState('active');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/layaway?${params}`);
      setPlans(data.plans || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterStatus]);

  useEffect(() => {
    if (!custSearch) return setCustomers([]);
    const t = setTimeout(async () => {
      const { data } = await api.get(`/customers?search=${custSearch}&limit=8`);
      setCustomers(data.customers || []);
    }, 250);
    return () => clearTimeout(t);
  }, [custSearch]);

  async function viewPlan(id) {
    const { data } = await api.get(`/layaway/${id}`);
    setSelected(data);
    setModal('view');
  }

  async function saveNew() {
    if (!form.customerId) return toast.error('Customer required');
    if (!form.totalAmount) return toast.error('Total amount required');
    setSaving(true);
    try {
      await api.post('/layaway', form);
      toast.success('Layaway plan created');
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function makePayment() {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return toast.error('Enter payment amount');
    setSaving(true);
    try {
      await api.post(`/layaway/${selected.id}/payment`, { amount: paymentAmount, paymentMethod });
      toast.success('Payment recorded');
      setPaymentAmount('');
      viewPlan(selected.id);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function cancelPlan(forfeited = false) {
    if (!confirm(forfeited ? 'Mark as forfeited? Customer loses deposit.' : 'Cancel this layaway?')) return;
    try {
      await api.put(`/layaway/${selected.id}/cancel`, { forfeited });
      toast.success(forfeited ? 'Marked as forfeited' : 'Cancelled');
      setModal(null);
      load();
    } catch { toast.error('Failed'); }
  }

  const remaining = selected ? parseFloat(selected.totalAmount) - parseFloat(selected.paidAmount) : 0;
  const progress = selected ? (parseFloat(selected.paidAmount) / parseFloat(selected.totalAmount)) * 100 : 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Layaway</h1>
          <p className="page-sub">Manage layaway plans and payment schedules</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ depositAmount: '0', paymentMethod: 'cash' }); setCustSearch(''); setCustomers([]); setModal('new'); }}>
          <PlusIcon className="w-4 h-4" />New Layaway Plan
        </button>
      </div>

      {/* Filter */}
      <div className="card py-3 flex gap-3">
        {['active', 'completed', 'cancelled', 'forfeited', ''].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === s ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card"><div className="text-2xl font-bold">{plans.filter(p => p.status === 'active').length}</div><div className="text-sm text-slate-500">Active Plans</div></div>
        <div className="card"><div className="text-2xl font-bold text-emerald-600">{fmt$(plans.filter(p => p.status === 'active').reduce((s, p) => s + parseFloat(p.paidAmount || 0), 0))}</div><div className="text-sm text-slate-500">Total Collected</div></div>
        <div className="card"><div className="text-2xl font-bold text-amber-600">{fmt$(plans.filter(p => p.status === 'active').reduce((s, p) => s + parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0), 0))}</div><div className="text-sm text-slate-500">Outstanding Balance</div></div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : plans.length === 0 ? (
          <div className="p-10 text-center">
            <ArchiveBoxIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No layaway plans</p>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className="table-th">Plan #</th><th className="table-th">Customer</th><th className="table-th">Total</th>
              <th className="table-th">Paid</th><th className="table-th">Remaining</th><th className="table-th">Due</th><th className="table-th">Status</th><th className="table-th"></th>
            </tr></thead>
            <tbody>
              {plans.map(p => {
                const remain = parseFloat(p.totalAmount) - parseFloat(p.paidAmount);
                return (
                  <tr key={p.id} className="table-row">
                    <td className="table-td font-mono text-xs">{p.layawayNumber}</td>
                    <td className="table-td">
                      <div className="font-medium">{p.Customer ? `${p.Customer.firstName} ${p.Customer.lastName}` : '—'}</div>
                      <div className="text-xs text-slate-400">{p.Customer?.phone}</div>
                    </td>
                    <td className="table-td font-semibold">{fmt$(p.totalAmount)}</td>
                    <td className="table-td text-emerald-600">{fmt$(p.paidAmount)}</td>
                    <td className="table-td text-amber-600 font-medium">{fmt$(remain)}</td>
                    <td className="table-td">{fmtDate(p.dueDate)}</td>
                    <td className="table-td"><span className={STATUS_COLORS[p.status]}>{p.status}</span></td>
                    <td className="table-td"><button className="text-brand-600 text-xs hover:underline" onClick={() => viewPlan(p.id)}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Layaway Modal */}
      {modal === 'new' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold">New Layaway Plan</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div>
                  <label className="label">Customer *</label>
                  <input className="input mb-1" placeholder="Search customer…" value={custSearch} onChange={e => setCustSearch(e.target.value)} />
                  {customers.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {customers.map(c => (
                        <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0 text-sm"
                          onClick={() => { setForm(f => ({ ...f, customerId: c.id })); setCustSearch(`${c.firstName} ${c.lastName}`); setCustomers([]); }}>
                          {c.firstName} {c.lastName} · {c.phone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Total Amount *</label><input type="number" className="input" value={form.totalAmount || ''} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} min="0" step="0.01" /></div>
                  <div><label className="label">Deposit Amount</label><input type="number" className="input" value={form.depositAmount || ''} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} min="0" step="0.01" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate || ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                  <div><label className="label">Payment Method</label>
                    <select className="input" value={form.paymentMethod || 'cash'} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveNew} disabled={saving}>{saving ? 'Saving…' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Plan Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2 className="font-semibold">{selected.layawayNumber}</h2>
                <p className="text-xs text-slate-500">{selected.Customer?.firstName} {selected.Customer?.lastName}</p>
              </div>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium">{fmt$(selected.paidAmount)} / {fmt$(selected.totalAmount)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-brand-600 h-3 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1 text-slate-500">
                  <span>Remaining: <strong>{fmt$(remaining)}</strong></span>
                  <span>{progress.toFixed(0)}% paid</span>
                </div>
              </div>

              {/* Payment history */}
              {selected.payments?.length > 0 && (
                <div className="mb-4">
                  <div className="section-title">Payment History</div>
                  {selected.payments.map(p => (
                    <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{new Date(p.createdAt).toLocaleDateString()} · {p.paymentMethod}</span>
                      <span className="font-semibold text-emerald-600">+{fmt$(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Make payment */}
              {selected.status === 'active' && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="section-title mb-0">Record Payment</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Amount</label><input type="number" className="input" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={fmt$(remaining)} max={remaining} min="0" step="0.01" /></div>
                    <div><label className="label">Method</label>
                      <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="btn-primary w-full justify-center" onClick={makePayment} disabled={saving}>{saving ? 'Processing…' : 'Record Payment'}</button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selected.status === 'active' && (
                <div className="flex gap-2 mr-auto">
                  <button className="btn-ghost text-xs text-slate-500" onClick={() => cancelPlan(false)}>Cancel Plan</button>
                  <button className="btn-ghost text-xs text-red-500" onClick={() => cancelPlan(true)}>Forfeit</button>
                </div>
              )}
              <button className="btn-secondary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
