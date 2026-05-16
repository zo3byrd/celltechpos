import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';

const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="#f3f4f6"/><rect x="90" y="80" width="120" height="140" rx="12" fill="#d1d5db"/><rect x="110" y="100" width="80" height="50" rx="4" fill="#9ca3af"/><circle cx="150" cy="185" r="15" fill="#9ca3af"/></svg>`);

function ItemImg({ src }) {
  const [err, setErr] = useState(false);
  return <img src={err || !src ? PLACEHOLDER : src} onError={() => setErr(true)} alt="" className="w-full h-full object-cover" />;
}

const CATEGORIES = ['part', 'accessory', 'device', 'plan', 'service', 'other'];
const fmt$ = v => '$' + parseFloat(v || 0).toFixed(2);

export default function Storefront() {
  const [params] = useSearchParams();
  const storeId = params.get('storeId');
  const [store, setStore] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    if (!storeId) { setError('No store specified'); setLoading(false); return; }
    setLoading(true);
    const p = new URLSearchParams({ storeId, page, limit: 48 });
    if (search) p.set('search', search);
    if (category) p.set('category', category);
    api.get(`/storefront?${p}`).then(r => {
      setStore(r.data.store);
      setItems(r.data.items);
      setTotal(r.data.total);
    }).catch(e => setError(e.response?.data?.error || 'Failed to load store'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [storeId, page, search, category]);

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><p className="text-2xl font-bold text-gray-700 mb-2">Oops!</p><p className="text-gray-500">{error}</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {store?.logoUrl && <img src={store.logoUrl} alt={store.name} className="h-10 w-auto object-contain" />}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{store?.name || 'Online Store'}</h1>
              {store?.phone && <p className="text-sm text-gray-500">{store.phone}</p>}
            </div>
          </div>
          <p className="text-sm text-gray-500">{total} products</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full max-w-xs"
            placeholder="Search products…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="aspect-square bg-gray-50">
                  <ItemImg src={item.imageUrl} />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
                  {item.brand && <p className="text-xs text-gray-400 mt-0.5">{item.brand}</p>}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400 capitalize bg-gray-50 px-2 py-0.5 rounded-full">{item.category}</span>
                    <span className="font-bold text-green-700 text-base">{fmt$(item.price)}</span>
                  </div>
                  {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
                  <p className="text-xs text-green-600 mt-1 font-medium">{item.quantity > 10 ? 'In Stock' : item.quantity > 0 ? `Only ${item.quantity} left!` : 'Out of Stock'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 48 && (
          <div className="flex items-center justify-center gap-3">
            <button
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 48)}</span>
            <button
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 48)}
            >Next →</button>
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by <strong>CellTechPOS</strong> · {store?.name}
      </footer>
    </div>
  );
}
