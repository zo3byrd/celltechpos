import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { TruckIcon, PlusIcon, XMarkIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUS_COLORS = {
  draft: 'badge-gray', ordered: 'badge-blue', partial: 'badge-yellow', received: 'badge-green', cancelled: 'badge-red',
};

const emptySupplier = { name: '', contact: '', email: '', phone: '', address: '', website: '', accountNumber: '', paymentTerms: 'Net 30', notes: '' };
const emptyPO = { supplierId: '', notes: '', expectedAt: '', items: [] };
const emptyItem = { name: '', sku: '', orderedQty: 1, unitCost: 0 };

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function Purchasing() {
  const [tab, setTab] = useState('orders');
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'supplier' | 'po' | 'receive' | 'view'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [poItems, setPoItems] = useState([{ ...emptyItem }]);
  const [receiveData, setReceiveData] = useState([]);

  async function loadSuppliers() {
    const { data } = await api.get('/suppliers');
    setSuppliers(data);
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/purchase-orders?${params}`);
      setOrders(data.orders || []);
      setTotalOrders(data.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadSuppliers(); loadOrders(); }, [filterStatus]);

  async function saveSupplier() {
    if (!form.name) return toast.error('Name required');
    setSaving(true);
    try {
      if (form.id) await api.put(`/suppliers/${form.id}`, form);
      else await api.post('/suppliers', form);
      toast.success('Supplier saved');
      setModal(null);
      loadSuppliers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function savePO() {
    setSaving(true);
    try {
      await api.post('/purchase-orders', { ...form, items: poItems });
      toast.success('Purchase order created');
      setModal(null);
      loadOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function viewPO(id) {
    const { data } = await api.get(`/purchase-orders/${id}`);
    setSelected(data);
    setReceiveData((data.items || []).map(i => ({ id: i.id, qty: 0, remaining: i.orderedQty - i.receivedQty })));
    setModal('view');
  }

  async function receivePO() {
    setSaving(true);
    try {
      await api.post(`/purchase-orders/${selected.id}/receive`, { receivedItems: receiveData.map(r => ({ id: r.id, qty: parseInt(r.qty) || 0 })) });
      toast.success('Stock updated');
      setModal(null);
      loadOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  function addPoItem() { setPoItems(p => [...p, { ...emptyItem }]); }
  function removePoItem(i) { setPoItems(p => p.filter((_, j) => j !== i)); }
  function updatePoItem(i, field, val) {
    setPoItems(p => p.map((item, j) => j === i ? { ...item, [field]: val } : item));
  }

  const poTotal = poItems.reduce((s, i) => s + (parseFloat(i.unitCost) || 0) * (parseInt(i.orderedQty) || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Purchasing</h1>
          <p className="page-sub">Suppliers and purchase orders</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { setForm(emptySupplier); setModal('supplier'); }}><BuildingStorefrontIcon className="w-4 h-4" />Add Supplier</button>
          <button className="btn-primary" onClick={() => { setForm(emptyPO); setPoItems([{ ...emptyItem }]); setModal('po'); }}><PlusIcon className="w-4 h-4" />New PO</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {['orders', 'suppliers'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'orders' ? `Purchase Orders (${totalOrders})` : `Suppliers (${suppliers.length})`}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          <div className="card py-3 flex gap-3">
            <select className="input w-44 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['draft','ordered','partial','received','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : orders.length === 0 ? (
              <div className="p-10 text-center"><TruckIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No purchase orders</p></div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="table-th">PO #</th><th className="table-th">Date</th><th className="table-th">Supplier</th>
                  <th className="table-th">Status</th><th className="table-th">Total</th><th className="table-th">Expected</th><th className="table-th"></th>
                </tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="table-row">
                      <td className="table-td font-mono text-xs">{o.poNumber}</td>
                      <td className="table-td">{fmtDate(o.createdAt)}</td>
                      <td className="table-td">{o.Supplier?.name || '—'}</td>
                      <td className="table-td"><span className={STATUS_COLORS[o.status]}>{o.status}</span></td>
                      <td className="table-td font-semibold">{fmt$(o.totalAmount)}</td>
                      <td className="table-td">{fmtDate(o.expectedAt)}</td>
                      <td className="table-td">
                        <button className="text-brand-600 text-xs hover:underline" onClick={() => viewPO(o.id)}>View / Receive</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-3 card text-center py-10 text-slate-500">No suppliers yet. Add your first supplier.</div>
          ) : suppliers.map(s => (
            <div key={s.id} className="card-hover cursor-pointer" onClick={() => { setForm(s); setModal('supplier'); }}>
              <div className="font-semibold text-slate-900">{s.name}</div>
              <div className="text-sm text-slate-500 mt-1">{s.contact} {s.email && `· ${s.email}`}</div>
              {s.phone && <div className="text-sm text-slate-500">{s.phone}</div>}
              {s.website && <div className="text-xs text-brand-600 mt-1">{s.website}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      {modal === 'supplier' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold">{form.id ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Name *</label><input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Contact</label><input className="input" value={form.contact || ''} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
                <div><label className="label">Email</label><input className="input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Website</label><input className="input" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
                <div><label className="label">Account #</label><input className="input" value={form.accountNumber || ''} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} /></div>
                <div><label className="label">Payment Terms</label><input className="input" value={form.paymentTerms || ''} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="Net 30" /></div>
                <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveSupplier} disabled={saving}>{saving ? 'Saving…' : 'Save Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {modal === 'po' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <h2 className="font-semibold">New Purchase Order</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Supplier</label>
                  <select className="input" value={form.supplierId || ''} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                    <option value="">— Select supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Expected Date</label>
                  <input type="date" className="input" value={form.expectedAt || ''} onChange={e => setForm(f => ({ ...f, expectedAt: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="section-title">Items</div>
              <div className="space-y-2">
                {poItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><input className="input text-sm" placeholder="Item name" value={item.name} onChange={e => updatePoItem(i, 'name', e.target.value)} /></div>
                    <div className="col-span-2"><input className="input text-sm" placeholder="SKU" value={item.sku} onChange={e => updatePoItem(i, 'sku', e.target.value)} /></div>
                    <div className="col-span-2"><input type="number" className="input text-sm" placeholder="Qty" value={item.orderedQty} onChange={e => updatePoItem(i, 'orderedQty', e.target.value)} min="1" /></div>
                    <div className="col-span-2"><input type="number" className="input text-sm" placeholder="Cost" value={item.unitCost} onChange={e => updatePoItem(i, 'unitCost', e.target.value)} min="0" step="0.01" /></div>
                    <div className="col-span-1"><button className="w-7 h-7 text-red-400 hover:text-red-600" onClick={() => removePoItem(i)}>✕</button></div>
                  </div>
                ))}
                <button className="btn-ghost text-xs" onClick={addPoItem}>+ Add Item</button>
              </div>

              <div className="mt-4 text-right font-semibold">Total: {fmt$(poTotal)}</div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={savePO} disabled={saving}>{saving ? 'Saving…' : 'Create PO'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View/Receive Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="font-semibold">{selected.poNumber}</h2>
                <p className="text-xs text-slate-500">{selected.Supplier?.name} · {selected.status}</p>
              </div>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Item</th>
                  <th className="text-center py-2 text-slate-500 font-medium">Ordered</th>
                  <th className="text-center py-2 text-slate-500 font-medium">Received</th>
                  <th className="text-center py-2 text-slate-500 font-medium">Receive Now</th>
                </tr></thead>
                <tbody>
                  {(selected.items || []).map((item, i) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2">{item.name}<div className="text-xs text-slate-400">{item.sku}</div></td>
                      <td className="py-2 text-center">{item.orderedQty}</td>
                      <td className="py-2 text-center">{item.receivedQty}</td>
                      <td className="py-2 text-center">
                        <input type="number" className="input w-16 text-center text-sm py-1"
                          value={receiveData[i]?.qty || 0}
                          max={receiveData[i]?.remaining || 0}
                          min="0"
                          onChange={e => setReceiveData(d => d.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected.status !== 'received' && selected.status !== 'cancelled' && (
                <p className="text-xs text-slate-500">Enter quantities received to update inventory stock.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Close</button>
              {selected.status !== 'received' && selected.status !== 'cancelled' && (
                <button className="btn-primary" onClick={receivePO} disabled={saving}>{saving ? 'Updating…' : 'Mark Received & Update Stock'}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
