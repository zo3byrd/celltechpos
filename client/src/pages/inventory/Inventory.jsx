import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { PhotoIcon, XMarkIcon, PrinterIcon, TagIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const CATEGORIES = ['part','accessory','device','plan','service','other'];

const PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="#f3f4f6"/><rect x="90" y="80" width="120" height="140" rx="12" fill="#d1d5db"/><rect x="110" y="100" width="80" height="50" rx="4" fill="#9ca3af"/><circle cx="150" cy="185" r="15" fill="#9ca3af"/></svg>`);

function ItemImage({ src, alt, className = '' }) {
  const [err, setErr] = useState(false);
  return (
    <img src={err || !src ? PLACEHOLDER : src} alt={alt} className={className} onError={() => setErr(true)} />
  );
}

function ImageUploader({ imageUrl, onChange }) {
  const inputRef = useRef();
  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 1024 * 1024) return toast.error('Image must be under 1 MB');
    const reader = new FileReader();
    reader.onload = e => onChange(e.target.result);
    reader.readAsDataURL(file);
  }
  function handleDrop(e) { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }
  const hasImage = !!imageUrl;
  return (
    <div className="col-span-2">
      <label className="label">Product Image</label>
      {hasImage ? (
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <ItemImage src={imageUrl} alt="preview" className="h-28 w-28 object-cover rounded-xl border border-gray-200 shadow" />
            <button type="button" onClick={() => onChange('')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow">
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-xl h-28 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors text-sm">
            <PhotoIcon className="w-6 h-6" />Replace image
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl h-32 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
          <PhotoIcon className="w-8 h-8" />
          <span className="text-sm font-medium">Click or drag to upload image</span>
          <span className="text-xs text-gray-300">PNG, JPG, WEBP — max 1 MB</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Barcode Label Printer ────────────────────────────────────────────────────
function printLabel(item, qty = 1) {
  const sku = item.sku || item.name.slice(0, 12).toUpperCase().replace(/\s+/g, '-');
  const price = '$' + parseFloat(item.price || 0).toFixed(2);

  // Simple Code-39 barcode SVG generator
  const CODE39_CHARS = {
    '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw',
    '5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
    'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn',
    'F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
    'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn',
    'P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
    'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn',
    'Z':'nwwnwnnnn','-':'nwnnnnwnw',' ':'nwnnwnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn',
    '+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn','.':'wwnnnnwnn',
  };
  const N = 1.5, W = 4, GAP = 1.5;
  function encodeChar(c) {
    const pat = CODE39_CHARS[c.toUpperCase()] || CODE39_CHARS['-'];
    let bars = []; let x = 0;
    pat.split('').forEach((t, i) => {
      const w = t === 'w' ? W : N;
      if (i % 2 === 0) bars.push({ x, w, fill: '#000' });
      x += w + (i % 2 === 1 ? 0 : 0);
      if (i % 2 === 1) x += GAP;
    });
    return { bars, width: x };
  }
  const text = '*' + sku + '*';
  let svgBars = []; let cx = 0;
  for (const ch of text) {
    const { bars, width } = encodeChar(ch);
    bars.forEach(b => svgBars.push({ x: cx + b.x, w: b.w }));
    cx += width + GAP;
  }
  const BH = 50;
  const barcodeW = cx;
  const barcodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${barcodeW}" height="${BH + 14}" viewBox="0 0 ${barcodeW} ${BH + 14}">
    ${svgBars.map(b => `<rect x="${b.x}" y="0" width="${b.w}" height="${BH}" fill="#000"/>`).join('')}
    <text x="${barcodeW / 2}" y="${BH + 12}" text-anchor="middle" font-family="monospace" font-size="9" fill="#000">${sku}</text>
  </svg>`;

  const labels = Array(Math.max(1, parseInt(qty) || 1)).fill(0).map(() => `
    <div class="label">
      <div class="store">CellTechPOS</div>
      <div class="name">${item.name.length > 32 ? item.name.slice(0, 32) + '…' : item.name}</div>
      ${item.brand ? `<div class="brand">${item.brand}</div>` : ''}
      <div class="barcode">${barcodeSvg}</div>
      <div class="price">${price}</div>
      ${item.category ? `<div class="cat">${item.category}</div>` : ''}
    </div>
  `).join('');

  const win = window.open('', '_blank', 'width=500,height=400');
  win.document.write(`<!DOCTYPE html><html><head><title>Label: ${item.name}</title>
  <style>
    @page { size: 2.25in 1.25in; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .label {
      width: 2.25in; height: 1.25in; padding: 4px 6px;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; border: 1px solid #ccc;
      page-break-after: always; overflow: hidden;
    }
    .store { font-size: 7pt; color: #666; letter-spacing: 0.05em; }
    .name { font-size: 9pt; font-weight: 700; text-align: center; line-height: 1.1; margin: 2px 0; }
    .brand { font-size: 7pt; color: #555; }
    .barcode { margin: 2px 0; max-width: 100%; overflow: hidden; }
    .barcode svg { max-width: 1.9in; height: auto; display: block; margin: 0 auto; }
    .price { font-size: 14pt; font-weight: 900; }
    .cat { font-size: 6pt; color: #888; margin-top: 1px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style></head><body>${labels}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}<\/script></body></html>`);
  win.document.close();
}

// ── Grid Card ────────────────────────────────────────────────────────────────
function GridCard({ item, onEdit, onAdjust, onPrint }) {
  const fmtMoney = v => `$${parseFloat(v || 0).toFixed(2)}`;
  const low = item.quantity <= item.minQuantity;
  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow ${low ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <ItemImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        {low && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Low Stock</span>}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{item.category}</span>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
        {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
        {item.sku && <p className="text-xs text-gray-300 font-mono">{item.sku}</p>}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          <div><p className="text-xs text-gray-400">Price</p><p className="font-bold text-gray-800">{fmtMoney(item.price)}</p></div>
          <div className="text-right"><p className="text-xs text-gray-400">Stock</p><p className={`font-bold ${low ? 'text-red-600' : 'text-green-600'}`}>{item.quantity}</p></div>
        </div>
        <div className="flex gap-1 mt-2">
          <button className="flex-1 text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg py-1.5 font-medium transition-colors" onClick={() => onEdit(item)}>Edit</button>
          <button className="flex-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded-lg py-1.5 font-medium transition-colors" onClick={() => onAdjust(item)}>Adjust</button>
          <button className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg py-1.5 px-2 font-medium transition-colors" onClick={() => onPrint(item)} title="Print label">
            <PrinterIcon className="w-3.5 h-3.5" />
          </button>
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
  const [view, setView] = useState('grid');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', category: 'accessory', brand: '', quantity: 0, minQuantity: 5, cost: '', price: '', description: '', imageUrl: '' });
  const [adjustQty, setAdjustQty] = useState('');
  const [printModal, setPrintModal] = useState(null);
  const [printQty, setPrintQty] = useState(1);

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
    setForm({ name: item.name, sku: item.sku || '', category: item.category, brand: item.brand || '', quantity: item.quantity, minQuantity: item.minQuantity, cost: item.cost, price: item.price, description: item.description || '', imageUrl: item.imageUrl || '' });
    setModal('edit');
  }
  function openAdjust(item) { setSelected(item); setAdjustQty(''); setModal('adjust'); }
  function openPrint(item) { setPrintModal(item); setPrintQty(1); }

  async function saveItem() {
    try {
      if (modal === 'add') { await api.post('/inventory', form); toast.success('Item added'); }
      else { await api.put(`/inventory/${selected.id}`, form); toast.success('Item updated'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function doAdjust() {
    try {
      await api.post(`/inventory/${selected.id}/adjust`, { quantity: parseInt(adjustQty), reason: 'Manual adjustment' });
      toast.success('Stock adjusted'); setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
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
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setView('grid')}>⊞</button>
            <button className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setView('list')}>☰</button>
          </div>
          <button className="btn-primary" onClick={() => { setForm({ name: '', sku: '', category: 'accessory', brand: '', quantity: 0, minQuantity: 5, cost: '', price: '', description: '', imageUrl: '' }); setModal('add'); }}>
            + Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search name, SKU, brand…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-40" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="rounded" />
          Low Stock Only
        </label>
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {loading ? [...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-square bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2"><div className="h-3 bg-gray-100 rounded animate-pulse" /><div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" /></div>
            </div>
          )) : items.map(item => (
            <GridCard key={item.id} item={item} onEdit={openEdit} onAdjust={openAdjust} onPrint={openPrint} />
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>{['', 'SKU', 'Name', 'Category', 'Brand', 'Qty', 'Min', 'Cost', 'Price', ''].map((h, i) => <th key={i} className="table-th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(8)].map((_, i) => <tr key={i}><td colSpan={10}><div className="h-4 m-3 bg-gray-100 rounded animate-pulse" /></td></tr>)
                : items.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.quantity <= item.minQuantity ? 'bg-red-50' : ''}`}>
                    <td className="table-td w-12"><ItemImage src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100" /></td>
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
                        <button className="text-xs text-purple-600 hover:underline flex items-center gap-1" onClick={() => openPrint(item)}><PrinterIcon className="w-3 h-3" />Label</button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{modal === 'add' ? 'Add Inventory Item' : 'Edit Item'}</h2>
            <ImageUploader imageUrl={form.imageUrl} onChange={url => setForm(p => ({ ...p, imageUrl: url }))} />
            <div className="grid grid-cols-2 gap-3">
              {[
                ['name','Name','text',2], ['sku','SKU','text',1], ['brand','Brand','text',1],
                ['category','Category','select',1], ['quantity','Quantity','number',1],
                ['minQuantity','Min Qty','number',1], ['cost','Cost ($)','number',1], ['price','Price ($)','number',1],
              ].map(([f, lbl, type, span]) => (
                <div key={f} className={span === 2 ? 'col-span-2' : ''}>
                  <label className="label">{lbl}</label>
                  {type === 'select' ? (
                    <select className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type={type} className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} step={type === 'number' ? '0.01' : undefined} />
                  )}
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Image URL <span className="text-gray-400 font-normal">(or paste a link)</span></label>
                <input type="url" className="input" placeholder="https://…" value={form.imageUrl?.startsWith('data:') ? '' : (form.imageUrl || '')} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} />
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

      {/* Adjust Stock Modal */}
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

      {/* Print Label Modal */}
      {printModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <TagIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Print Label</h2>
                <p className="text-sm text-gray-500 truncate max-w-[220px]">{printModal.name}</p>
              </div>
            </div>

            {/* Label preview */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
              <div style={{ width: '2.25in', margin: '0 auto', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', background: '#fff', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ fontSize: 7, color: '#9ca3af', letterSpacing: '0.05em', marginBottom: 2 }}>CellTechPOS</div>
                <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{printModal.name.length > 28 ? printModal.name.slice(0, 28) + '…' : printModal.name}</div>
                {printModal.brand && <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>{printModal.brand}</div>}
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', background: '#000', color: '#000', height: 28, margin: '4px 0', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                  {/* Visual barcode preview */}
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} style={{ position: 'absolute', left: i * 4.5 + '%', top: 0, bottom: 0, width: [1,3,1,2,1,3,1,1,2,1][i%10] + 'px', background: i%3===0 ? '#fff' : '#000' }} />
                  ))}
                </div>
                <div style={{ fontSize: 8, color: '#6b7280', fontFamily: 'monospace', marginBottom: 3 }}>{printModal.sku || printModal.name.slice(0,12).toUpperCase().replace(/\s+/g,'-')}</div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>${parseFloat(printModal.price || 0).toFixed(2)}</div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Label size: 2.25" × 1.25" (standard)</p>
            </div>

            <div>
              <label className="label">Number of labels to print</label>
              <input type="number" min="1" max="100" className="input" value={printQty} onChange={e => setPrintQty(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { printLabel(printModal, printQty); setPrintModal(null); }}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
                <PrinterIcon className="w-4 h-4" /> Print {printQty > 1 ? `${printQty} Labels` : 'Label'}
              </button>
              <button onClick={() => setPrintModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
