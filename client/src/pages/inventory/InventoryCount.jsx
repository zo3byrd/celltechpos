import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function InventoryCount() {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewCount, setViewCount] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [form, setForm] = useState({ name: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory-counts');
      setCounts(data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createCount() {
    if (!form.name) return toast.error('Name required');
    setSaving(true);
    try {
      await api.post('/inventory-counts', form);
      toast.success('Count session started');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function openCount(id) {
    setViewLoading(true);
    try {
      const { data } = await api.get(`/inventory-counts/${id}`);
      setViewCount(data);
    } catch { toast.error('Failed to load count'); }
    finally { setViewLoading(false); }
  }

  async function updateItem(countId, itemId, countedQty) {
    try {
      await api.put(`/inventory-counts/${countId}/items/${itemId}`, { countedQty: parseInt(countedQty) });
      setViewCount(v => ({
        ...v,
        countItems: v.countItems.map(ci =>
          ci.id === itemId ? { ...ci, countedQty: parseInt(countedQty), variance: parseInt(countedQty) - ci.expectedQty } : ci
        ),
      }));
    } catch { toast.error('Failed to update'); }
  }

  async function completeCount(apply) {
    if (!confirm(apply ? 'Apply all adjustments and update inventory quantities?' : 'Mark as complete without applying adjustments?')) return;
    setSaving(true);
    try {
      await api.post(`/inventory-counts/${viewCount.id}/complete`, { applyAdjustments: apply });
      toast.success(apply ? 'Adjustments applied and count completed' : 'Count completed');
      setViewCount(null);
      load();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  const filteredItems = viewCount?.countItems?.filter(ci =>
    !search || ci.item?.name?.toLowerCase().includes(search.toLowerCase()) || ci.item?.sku?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const uncounted = filteredItems.filter(ci => ci.countedQty === null || ci.countedQty === undefined).length;
  const variances = filteredItems.filter(ci => ci.variance !== 0 && ci.variance !== null).length;

  if (viewCount) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <button className="text-brand-600 text-sm hover:underline mb-1" onClick={() => setViewCount(null)}>← Back to counts</button>
            <h1 className="page-title">{viewCount.name}</h1>
            <p className="page-sub">Started {fmtDate(viewCount.createdAt)} · {viewCount.status}</p>
          </div>
          {viewCount.status === 'in_progress' && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => completeCount(false)} disabled={saving}>Complete (no adjust)</button>
              <button className="btn-primary" onClick={() => completeCount(true)} disabled={saving}>Apply Adjustments</button>
            </div>
          )}
        </div>

        {viewCount.status === 'in_progress' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="card"><div className="text-2xl font-bold">{filteredItems.length}</div><div className="text-sm text-slate-500">Total Items</div></div>
            <div className="card"><div className="text-2xl font-bold text-amber-500">{uncounted}</div><div className="text-sm text-slate-500">Not Counted</div></div>
            <div className="card"><div className="text-2xl font-bold text-red-500">{variances}</div><div className="text-sm text-slate-500">Variances Found</div></div>
          </div>
        )}

        <div className="card py-3">
          <input className="input w-64" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className="table-th">Item</th><th className="table-th">SKU</th><th className="table-th">Category</th>
              <th className="table-th">Expected</th><th className="table-th">Counted</th><th className="table-th">Variance</th>
            </tr></thead>
            <tbody>
              {filteredItems.map(ci => {
                const hasDiff = ci.variance !== 0 && ci.variance !== null;
                return (
                  <tr key={ci.id} className={`table-row ${hasDiff ? 'bg-red-50' : ''}`}>
                    <td className="table-td font-medium">{ci.item?.name}</td>
                    <td className="table-td text-xs text-slate-500">{ci.item?.sku}</td>
                    <td className="table-td capitalize text-xs">{ci.item?.category}</td>
                    <td className="table-td">{ci.expectedQty}</td>
                    <td className="table-td">
                      {viewCount.status === 'in_progress' ? (
                        <input
                          type="number"
                          className="input w-20 py-1 text-sm text-center"
                          defaultValue={ci.countedQty ?? ''}
                          min="0"
                          onBlur={e => updateItem(viewCount.id, ci.id, e.target.value)}
                          placeholder="—"
                        />
                      ) : (
                        <span>{ci.countedQty ?? '—'}</span>
                      )}
                    </td>
                    <td className="table-td">
                      {ci.variance !== null ? (
                        <span className={`font-semibold ${ci.variance > 0 ? 'text-emerald-600' : ci.variance < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {ci.variance > 0 ? '+' : ''}{ci.variance}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory Count</h1>
          <p className="page-sub">Physical inventory verification and adjustment sessions</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ name: `Count ${new Date().toLocaleDateString()}`, notes: '' }); setModal(true); }}>
          <PlusIcon className="w-4 h-4" />Start New Count
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : counts.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheckIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No inventory counts yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className="table-th">Name</th><th className="table-th">Started</th><th className="table-th">Completed</th><th className="table-th">Status</th><th className="table-th">By</th><th className="table-th"></th>
            </tr></thead>
            <tbody>
              {counts.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-td font-medium">{c.name}</td>
                  <td className="table-td">{fmtDate(c.createdAt)}</td>
                  <td className="table-td">{fmtDate(c.completedAt)}</td>
                  <td className="table-td"><span className={c.status === 'completed' ? 'badge-green' : c.status === 'in_progress' ? 'badge-blue' : 'badge-gray'}>{c.status.replace('_', ' ')}</span></td>
                  <td className="table-td">{c.User?.name}</td>
                  <td className="table-td"><button className="text-brand-600 text-xs hover:underline" onClick={() => openCount(c.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-semibold">Start Inventory Count</h2>
              <button onClick={() => setModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-slate-500">A snapshot of current quantities will be created. Count all items and apply adjustments at the end.</p>
              <div><label className="label">Count Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createCount} disabled={saving}>{saving ? 'Starting…' : 'Start Count'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
