import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { WrenchScrewdriverIcon, PlusIcon, ArrowDownTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const CONDITIONS = ['new', 'refurbished', 'oem', 'aftermarket'];
const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><rect x="60" y="60" width="80" height="80" rx="8" fill="#d1d5db"/><circle cx="100" cy="100" r="20" fill="#9ca3af"/></svg>`);

function ItemImg({ src }) {
  const [err, setErr] = useState(false);
  return <img src={err || !src ? PLACEHOLDER : src} onError={() => setErr(true)} alt="" className="w-full h-full object-cover" />;
}

const fmt$ = v => '$' + parseFloat(v || 0).toFixed(2);

export default function PartsCatalog() {
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', brand: '', deviceModel: '', condition: 'new', cost: '', price: '', quantity: 0, description: '', imageUrl: '' });
  const importRef = useRef(null);

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 50 });
    if (search) p.set('search', search);
    api.get(`/parts?${p}`).then(r => { setParts(r.data.parts || []); setTotal(r.data.total || 0); }).finally(() => setLoading(false));
  }

  useEffect(load, [page, search]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  function openAdd() {
    setSelected(null);
    setForm({ name: '', sku: '', brand: '', deviceModel: '', condition: 'new', cost: '', price: '', quantity: 0, description: '', imageUrl: '' });
    setModal('edit');
  }

  function openEdit(p) {
    setSelected(p);
    setForm({ name: p.name, sku: p.sku || '', brand: p.brand || '', deviceModel: p.deviceModel || '', condition: p.condition || 'new', cost: p.cost || '', price: p.price || '', quantity: p.quantity || 0, description: p.description || '', imageUrl: p.imageUrl || '' });
    setModal('edit');
  }

  async function save() {
    try {
      if (selected) { await api.put(`/parts/${selected.id}`, form); toast.success('Updated'); }
      else { await api.post('/parts', form); toast.success('Part added'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function remove(id) {
    if (!confirm('Delete this part?')) return;
    try { await api.delete(`/parts/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  }

  function handleImg(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) return toast.error('Image must be < 1MB');
    const reader = new FileReader();
    reader.onload = e => set('imageUrl', e.target.result);
    reader.readAsDataURL(file);
  }

  function exportCSV() {
    api.get('/parts/export/csv', { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'parts-catalog.csv'; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => toast.error('Export failed'));
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><WrenchScrewdriverIcon className="w-6 h-6" />Parts Catalog</h1>
          <p className="page-sub">{total} parts tracked</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={exportCSV}><ArrowDownTrayIcon className="w-4 h-4" /> Export</button>
          <button className="btn-primary flex items-center gap-1.5" onClick={openAdd}><PlusIcon className="w-4 h-4" /> Add Part</button>
        </div>
      </div>

      <input className="input max-w-sm" placeholder="Search name, SKU, brand, model…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />

      {loading ? (
        <div className="card animate-pulse h-48 bg-gray-100" />
      ) : parts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No parts in catalog yet</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {parts.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-50 overflow-hidden">
                <ItemImg src={p.imageUrl} />
              </div>
              <div className="p-3 space-y-1">
                <p className="font-semibold text-sm text-gray-900 line-clamp-2">{p.name}</p>
                {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                {p.deviceModel && <p className="text-xs text-brand-600">{p.deviceModel}</p>}
                <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-xs">
                  <span className={`px-1.5 py-0.5 rounded-full capitalize font-semibold ${p.condition === 'new' ? 'bg-green-100 text-green-700' : p.condition === 'oem' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{p.condition}</span>
                  <span className="font-bold text-gray-800">{fmt$(p.price)}</span>
                </div>
                <div className="flex gap-1">
                  <button className="flex-1 text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg py-1 font-medium" onClick={() => openEdit(p)}>Edit</button>
                  <button className="text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg py-1 px-2 font-medium" onClick={() => remove(p.id)}>Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {Math.ceil(total / 50)}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Prev</button>
            <button className="btn-secondary" onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/50)}>Next</button>
          </div>
        </div>
      )}

      {modal === 'edit' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-lg">
            <div className="modal-header"><h2 className="font-semibold">{selected ? 'Edit Part' : 'Add Part'}</h2><button onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="label">Part Name *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
                <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} /></div>
                <div><label className="label">Brand</label><input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
                <div><label className="label">Compatible Model</label><input className="input" placeholder="iPhone 14 Pro…" value={form.deviceModel} onChange={e => set('deviceModel', e.target.value)} /></div>
                <div>
                  <label className="label">Condition</label>
                  <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Cost ($)</label><input type="number" className="input" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} /></div>
                <div><label className="label">Price ($)</label><input type="number" className="input" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} /></div>
                <div><label className="label">Stock Qty</label><input type="number" className="input" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input h-16 resize-none" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Image</label>
                  {form.imageUrl ? (
                    <div className="flex gap-3 items-start">
                      <img src={form.imageUrl} className="w-20 h-20 object-cover rounded-lg border" alt="" />
                      <button className="text-xs text-red-500 hover:underline" onClick={() => set('imageUrl', '')}>Remove</button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 text-gray-400 text-sm"
                      onClick={() => importRef.current?.click()} onDrop={e => { e.preventDefault(); handleImg(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()}>
                      <PhotoIcon className="w-6 h-6 mb-1" /> Click or drag image
                    </div>
                  )}
                  <input ref={importRef} type="file" accept="image/*" className="hidden" onChange={e => handleImg(e.target.files[0])} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
