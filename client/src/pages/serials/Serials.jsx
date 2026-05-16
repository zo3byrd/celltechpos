import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { QrCodeIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUS_OPTIONS = ['available','sold','returned','scrapped'];
const STATUS_COLORS = {
  available: 'bg-green-100 text-green-700',
  sold:      'bg-blue-100 text-blue-700',
  returned:  'bg-yellow-100 text-yellow-700',
  scrapped:  'bg-red-100 text-red-600',
};

const EMPTY_FORM = { serial: '', imei: '', status: 'available', itemId: '', notes: '' };

export default function Serials() {
  const [serials, setSerials]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [items, setItems]       = useState([]);

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ limit: 50 });
    if (search) p.set('search', search);
    if (statusFilter) p.set('status', statusFilter);
    api.get(`/serials?${p}`)
      .then(r => { setSerials(r.data.serials || []); setTotal(r.data.total || 0); })
      .catch(() => toast.error('Failed to load serials'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [search, statusFilter]);

  useEffect(() => {
    api.get('/inventory?limit=200').then(r => setItems(r.data.items || [])).catch(() => {});
  }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({ serial: s.serial || '', imei: s.imei || '', status: s.status || 'available', itemId: s.itemId || '', notes: s.notes || '' });
    setModal(true);
  }

  async function save() {
    if (!form.serial && !form.imei) return toast.error('Enter a serial number or IMEI');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/serials/${editing.id}`, form);
        toast.success('Updated');
      } else {
        await api.post('/serials', form);
        toast.success('Serial added');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this serial record?')) return;
    try {
      await api.delete(`/serials/${id}`);
      toast.success('Deleted');
      load();
    } catch { toast.error('Delete failed'); }
  }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serial / IMEI Tracker</h1>
          <p className="text-sm text-gray-500">{total} records</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openNew}>
          <PlusIcon className="w-4 h-4" /> Add Serial
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 w-64"
            placeholder="Search serial or IMEI…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: '#f9fafb' }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Serial / IMEI</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Linked Item</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : serials.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                <QrCodeIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                No serials yet. Add device IMEIs and serial numbers to track them.
              </td></tr>
            ) : serials.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(s)}>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs font-semibold text-gray-800">{s.serial || '—'}</div>
                  {s.imei && <div className="font-mono text-xs text-gray-500">IMEI: {s.imei}</div>}
                </td>
                <td className="px-4 py-3 text-gray-700">{s.item?.name || <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-500'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{s.notes || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={e => { e.stopPropagation(); remove(s.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? 'Edit Serial' : 'Add Serial / IMEI'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Serial Number</label>
                <input className="input font-mono" value={form.serial} onChange={e => set('serial', e.target.value)} placeholder="Device serial number" />
              </div>
              <div>
                <label className="label">IMEI</label>
                <input className="input font-mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="15-digit IMEI" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Linked Inventory Item (optional)</label>
                <select className="input" value={form.itemId} onChange={e => set('itemId', e.target.value)}>
                  <option value="">— None —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Purchased from wholesaler, unlocked" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button className="btn-primary flex-1" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Serial')}
              </button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
