import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const CATEGORIES = ['part','accessory','device','plan','service','other'];

const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="#f3f4f6"/><rect x="90" y="80" width="120" height="140" rx="12" fill="#d1d5db"/><rect x="110" y="100" width="80" height="50" rx="4" fill="#9ca3af"/><circle cx="150" cy="185" r="15" fill="#9ca3af"/></svg>`);

function ItemImage({ src, alt, className = '' }) {
  const [err, setErr] = useState(false);
  return (
    <img
      src={err || !src ? PLACEHOLDER : src}
      alt={alt}
      className={className}
      onError={() => setErr(true)}
    />
  );
}

function GridCard({ item, onEdit, onAdjust }) {
  const fmtMoney = v => `$${parseFloat(v || 0).toFixed(2)}`;
  const low = item.quantity <= item.minQuantity;
  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow ${low ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <ItemImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        {low && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            Low Stock
          </span>
        )}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {item.category}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
        {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
        {item.sku && <p className="text-xs text-gray-300 font-mono">{item.sku}</p>}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Price</p>
            <p className="font-bold text-gray-800">{fmtMoney(item.price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Stock</p>
            <p className={`font-bold ${low ? 'text-red-600' : 'text-green-600'}`}>{item.quantity}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="flex-1 text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg py-1.5 font-medium transition-colors" onClick={() => onEdit(item)}>Edit</button>
          <button className="flex-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded-lg py-1.5 font-medium transition-colors" onClick={() => onAdjust(item)}>Adjust</button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: '', sku: '', category: 'accessory', brand: '', quantity: 0,
    minQuantity: 5, cost: '', price: '', description: '', imageUrl: '',
  });
  const [adjustQty, setAdjustQty] = useState('');

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 60 });
    if (search) p.set('search', search);
    if (category) p.set('category', category);
    if (lowStock) p.set('lowStock', 'true');
    api.get(`/inventory?${p}`)
      .then(r => { setItems(r.data.items); setTotal(r.data.total || r.data.items.length); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search, category, lowStock]);

  function openEdit(item) {
    setSelected(item);
    setForm({
      name: item.name, sku: item.sku || '', category: item.category,
      brand: item.brand || '', quantity: item.quantity, minQuantity: item.minQuantity,
      cost: item.cost, price: item.price, description: item.description || '',
      imageUrl: item.imageUrl || '',
    });
    setModal('edit');
  }

  function openAdjust(item) { setSelected(item); setAdjustQty(''); setModal('adjust'); }

  async function saveItem() {
    try {
      if (modal === 'add') {
        await api.post('/inventory', form);
        toast.success('Item added');
      } else {
        await api.put(`/inventory/${selected.id}`, form);
        toast.success('Item updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  async function doAdjust() {
    try {
      await api.post(`/inventory/${selected.id}/adjust`, { quantity: parseInt(adjustQty), reason: 'Manual adjustment' });
      toast.success('Stock adjusted');
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  const fmtMoney = v => `$${parseFloat(v || 0).toFixed(2)}`;

  const PAGES = Math.ceil(total / 60);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{total} items</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setView('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              setForm({ name: '', sku: '', category: 'accessory', brand: '', quantity: 0, minQuantity: 5, cost: '', price: '', description: '', imageUrl: '' });
              setModal('add');
            }}
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, SKU, brand…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input w-40" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="rounded" />
          Low Stock Only
        </label>
      </div>

      {/* ── Grid view ── */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {loading
            ? [...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="aspect-square bg-gray-100 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))
            : items.map(item => (
                <GridCard key={item.id} item={item} onEdit={openEdit} onAdjust={openAdjust} />
              ))
          }
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['', 'SKU', 'Name', 'Category', 'Brand', 'Qty', 'Min', 'Cost', 'Price', ''].map((h, i) => (
                  <th key={i} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}><td colSpan={10}><div className="h-4 m-3 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : items.map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.quantity <= item.minQuantity ? 'bg-red-50' : ''}`}>
                      <td className="table-td w-12">
                        <ItemImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-100"
                        />
                      </td>
                      <td className="table-td font-mono text-xs text-gray-500">{item.sku || '—'}</td>
                      <td className="table-td font-medium max-w-xs truncate">{item.name}</td>
                      <td className="table-td"><span className="badge badge-gray">{item.category}</span></td>
                      <td className="table-td">{item.brand || '—'}</td>
                      <td className={`table-td font-semibold ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-gray-700'}`}>{item.quantity}</td>
                      <td className="table-td text-gray-400">{item.minQuantity}</td>
                      <td className="table-td">{fmtMoney(item.cost)}</td>
                      <td className="table-td font-medium">{fmtMoney(item.price)}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button className="text-xs text-brand-600 hover:underline" onClick={() => openEdit(item)}>Edit</button>
                          <button className="text-xs text-green-600 hover:underline" onClick={() => openAdjust(item)}>Adjust</button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {PAGES > 1 && (
        <div className="flex items-center gap-2 justify-center pt-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-sm text-gray-500">Page {page} of {PAGES}</span>
          <button className="btn-secondary text-sm" disabled={page >= PAGES} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{modal === 'add' ? 'Add Inventory Item' : 'Edit Item'}</h2>

            {/* Image preview */}
            {form.imageUrl && (
              <div className="flex justify-center">
                <ItemImage
                  src={form.imageUrl}
                  alt="preview"
                  className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                ['name',        'Name',         'text',   2],
                ['sku',         'SKU',          'text',   1],
                ['brand',       'Brand',        'text',   1],
                ['category',    'Category',     'select', 1],
                ['quantity',    'Quantity',     'number', 1],
                ['minQuantity', 'Min Qty',      'number', 1],
                ['cost',        'Cost ($)',     'number', 1],
                ['price',       'Price ($)',    'number', 1],
              ].map(([f, lbl, type, span]) => (
                <div key={f} className={span === 2 ? 'col-span-2' : ''}>
                  <label className="label">{lbl}</label>
                  {type === 'select' ? (
                    <select className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      className="input"
                      value={form[f]}
                      onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                      step={type === 'number' ? '0.01' : undefined}
                    />
                  )}
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Image URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://images.unsplash.com/…"
                  value={form.imageUrl}
                  onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea className="input h-16 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary" onClick={saveItem}>Save</button>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ── */}
      {modal === 'adjust' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex gap-4 items-start">
              <ItemImage src={selected?.imageUrl} alt={selected?.name} className="w-16 h-16 object-cover rounded-xl border border-gray-100 shrink-0" />
              <div>
                <h2 className="text-lg font-bold leading-tight">{selected?.name}</h2>
                <p className="text-sm text-gray-500">Current stock: <strong>{selected?.quantity}</strong></p>
              </div>
            </div>
            <div>
              <label className="label">Quantity to Add (+) or Remove (−)</label>
              <input type="number" className="input" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. 10 or -3" />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={doAdjust}>Apply</button>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
