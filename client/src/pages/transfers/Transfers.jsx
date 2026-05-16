import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowsRightLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const STATUS_COLORS = {
  pending: 'badge-yellow', approved: 'badge-blue', shipped: 'badge-purple',
  received: 'badge-green', cancelled: 'badge-red',
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

export default function Transfers() {
  const { user } = useAuthStore();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const [transfers, setTransfers] = useState([]);
  const [stores, setStores] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ itemId: '', toStoreId: '', quantity: 1, notes: '' });
  const [itemSearch, setItemSearch] = useState('');

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    api.get(`/transfers?${p}`).then(r => setTransfers(r.data)).finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);
  useEffect(() => { api.get('/admin/store').then().catch(() => {}); }, []);
  useEffect(() => {
    const p = new URLSearchParams({ limit: 200 });
    if (itemSearch) p.set('search', itemSearch);
    api.get(`/inventory?${p}`).then(r => setInventory(r.data.items || [])).catch(() => {});
  }, [itemSearch]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function save() {
    try {
      await api.post('/transfers', form);
      toast.success('Transfer request created');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function action(id, endpoint) {
    try {
      await api.put(`/transfers/${id}/${endpoint}`);
      toast.success(`Transfer ${endpoint}`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Action failed'); }
  }

  const outgoing = transfers.filter(t => t.fromStoreId === user?.storeId);
  const incoming = transfers.filter(t => t.toStoreId === user?.storeId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><ArrowsRightLeftIcon className="w-6 h-6" />Inventory Transfers</h1>
          <p className="page-sub">Move inventory between locations</p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex items-center gap-1.5" onClick={() => { setForm({ itemId: '', toStoreId: '', quantity: 1, notes: '' }); setModal(true); }}>
            <PlusIcon className="w-4 h-4" /> New Transfer
          </button>
        )}
      </div>

      <div className="card py-3 flex gap-3 items-end">
        <div>
          <label className="label text-xs">Status Filter</label>
          <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {['pending','approved','shipped','received','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card animate-pulse h-48 bg-gray-100" />
      ) : (
        <div className="space-y-6">
          {outgoing.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Outgoing Transfers</h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    {['Item','Qty','To Store','Status','Date','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {outgoing.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{t.item?.name || '—'}</td>
                        <td className="table-td text-center">{t.quantity}</td>
                        <td className="table-td">{t.toStore?.name || '—'}</td>
                        <td className="table-td"><span className={`${STATUS_COLORS[t.status] || 'badge-gray'} capitalize`}>{t.status}</span></td>
                        <td className="table-td text-gray-400">{fmtDate(t.createdAt)}</td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            {isAdmin && t.status === 'pending' && <button className="text-xs btn-secondary py-0.5 px-2" onClick={() => action(t.id, 'approve')}>Approve</button>}
                            {isAdmin && t.status === 'approved' && <button className="text-xs btn-primary py-0.5 px-2" onClick={() => action(t.id, 'ship')}>Ship</button>}
                            {isAdmin && ['pending','approved'].includes(t.status) && <button className="text-xs text-red-500 hover:underline" onClick={() => action(t.id, 'cancel')}>Cancel</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {incoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Incoming Transfers</h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    {['Item','Qty','From Store','Status','Date','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {incoming.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{t.item?.name || '—'}</td>
                        <td className="table-td text-center">{t.quantity}</td>
                        <td className="table-td">{t.fromStore?.name || '—'}</td>
                        <td className="table-td"><span className={`${STATUS_COLORS[t.status] || 'badge-gray'} capitalize`}>{t.status}</span></td>
                        <td className="table-td text-gray-400">{fmtDate(t.createdAt)}</td>
                        <td className="table-td">
                          {isAdmin && t.status === 'shipped' && <button className="text-xs btn-success py-0.5 px-2" onClick={() => action(t.id, 'receive')}>Mark Received</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {outgoing.length === 0 && incoming.length === 0 && (
            <div className="card text-center py-12 text-gray-400">No transfers{statusFilter ? ` with status "${statusFilter}"` : ''}</div>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-md">
            <div className="modal-header"><h2 className="font-semibold">New Transfer Request</h2><button onClick={() => setModal(false)}>✕</button></div>
            <div className="modal-body space-y-3">
              <div>
                <label className="label">Search Item</label>
                <input className="input" placeholder="Search inventory…" value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
              </div>
              <div>
                <label className="label">Select Item</label>
                <select className="input" value={form.itemId} onChange={e => set('itemId', e.target.value)}>
                  <option value="">— Select —</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (qty: {i.quantity})</option>)}
                </select>
              </div>
              <div><label className="label">Quantity</label><input type="number" className="input" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
              <div>
                <label className="label">Destination Store ID</label>
                <input className="input font-mono text-sm" placeholder="Store UUID" value={form.toStoreId} onChange={e => set('toStoreId', e.target.value)} />
              </div>
              <div><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Request Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
