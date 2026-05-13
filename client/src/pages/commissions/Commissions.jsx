import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const STATUS_BADGE = { pending:'badge-yellow', approved:'badge-blue', paid:'badge-green' };

export default function Commissions() {
  const { user } = useAuthStore();
  const isAdmin = ['superadmin','admin'].includes(user?.role);

  const [commissions, setCommissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ userId:'', periodStart:'', periodEnd:'' });

  function load() {
    setLoading(true);
    api.get('/commissions').then(r => setCommissions(r.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);
  useEffect(() => {
    if (isAdmin) api.get('/admin/users').then(r => setUsers(r.data.filter(u => u.role === 'sales_rep')));
  }, [isAdmin]);

  async function calculate() {
    try {
      await api.post('/commissions/calculate', form);
      toast.success('Commission calculated');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  async function approve(id) {
    await api.put(`/commissions/${id}/approve`);
    toast.success('Approved');
    load();
  }

  async function markPaid(id) {
    await api.put(`/commissions/${id}/pay`, { notes: 'Paid' });
    toast.success('Marked as paid');
    load();
  }

  const fmt = v => `$${parseFloat(v || 0).toFixed(2)}`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commissions & Spiffs</h1>
          <p className="text-sm text-gray-500">{commissions.length} records</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setForm({ userId:'', periodStart:'', periodEnd:'' }); setModal(true); }}>
            Calculate Commission
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>{['Sales Rep','Period','Activations','Repairs','Sales','Spiffs','Total','Status',''].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? [...Array(3)].map((_, i) => (
              <tr key={i}><td colSpan={9}><div className="h-4 m-3 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : commissions.length === 0 ? (
              <tr><td colSpan={9} className="table-td text-center text-gray-400 py-8">No commission records</td></tr>
            ) : commissions.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{c.User?.name || '—'}</td>
                <td className="table-td text-xs">{c.periodStart} → {c.periodEnd}</td>
                <td className="table-td">{fmt(c.activationCommission)}</td>
                <td className="table-td">{fmt(c.repairCommission)}</td>
                <td className="table-td">{fmt(c.salesCommission)}</td>
                <td className="table-td text-green-600 font-medium">{fmt(c.spiffTotal)}</td>
                <td className="table-td font-bold">{fmt(c.total)}</td>
                <td className="table-td"><span className={STATUS_BADGE[c.status] || 'badge-gray'}>{c.status}</span></td>
                <td className="table-td">
                  {isAdmin && (
                    <div className="flex gap-2">
                      {c.status === 'pending' && <button className="text-xs text-brand-600 hover:underline" onClick={() => approve(c.id)}>Approve</button>}
                      {c.status === 'approved' && <button className="text-xs text-green-600 hover:underline" onClick={() => markPaid(c.id)}>Mark Paid</button>}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold">Calculate Commission</h2>
            <div>
              <label className="label">Sales Rep</label>
              <select className="input" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">— Select —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Period Start</label>
              <input type="date" className="input" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
            </div>
            <div>
              <label className="label">Period End</label>
              <input type="date" className="input" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={calculate}>Calculate</button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
