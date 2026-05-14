import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, XMarkIcon, UserIcon, TrashIcon,
  PrinterIcon, BanknotesIcon, CreditCardIcon, ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const CATEGORIES = ['all', 'part', 'accessory', 'device', 'service', 'plan', 'other'];
const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);

const PAY_METHODS = [
  { key: 'cash',  label: 'Cash',  icon: BanknotesIcon,  color: 'bg-green-600 text-white border-green-600' },
  { key: 'card',  label: 'Card',  icon: CreditCardIcon, color: 'bg-blue-600 text-white border-blue-600' },
  { key: 'check', label: 'Check', icon: BanknotesIcon,  color: 'bg-gray-600 text-white border-gray-600' },
  { key: 'split', label: 'Split', icon: BanknotesIcon,  color: 'bg-amber-600 text-white border-amber-600' },
];

function catLabel(c) {
  if (c === 'all') return 'All';
  return c.charAt(0).toUpperCase() + c.slice(1) + 's';
}

export default function POS() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [browseItems, setBrowseItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [showCustList, setShowCustList] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [checkNumber, setCheckNumber]   = useState('');
  const [cardRef, setCardRef]           = useState('');
  const [splitCash, setSplitCash]       = useState('');
  const [splitCard, setSplitCard]       = useState('');
  const [discount, setDiscount] = useState('');
  const [taxRate] = useState(0.0825);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [mobileView, setMobileView] = useState('browse');
  const searchRef = useRef(null);

  // Load items when search or category changes
  useEffect(() => {
    const params = new URLSearchParams({ limit: 40 });
    if (search) params.set('search', search);
    if (category !== 'all') params.set('category', category);
    const t = setTimeout(() => {
      api.get(`/inventory?${params}`).then(r => setBrowseItems(r.data.items || [])).catch(() => {});
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [search, category]);

  useEffect(() => {
    if (!custSearch) return setCustomers([]);
    const t = setTimeout(() => {
      api.get(`/customers?search=${custSearch}&limit=8`).then(r => setCustomers(r.data.customers || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  function addToCart(item) {
    setCart(c => {
      const existing = c.find(x => x.id === item.id);
      if (existing) return c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { ...item, qty: 1, unitPrice: parseFloat(item.price) }];
    });
  }

  function updateQty(id, qty) {
    if (qty < 1) return setCart(c => c.filter(x => x.id !== id));
    setCart(c => c.map(x => x.id === id ? { ...x, qty } : x));
  }

  function updatePrice(id, price) {
    const p = parseFloat(price);
    if (!isNaN(p) && p >= 0) setCart(c => c.map(x => x.id === id ? { ...x, unitPrice: p } : x));
  }

  function selectCustomer(c) {
    setCustomerId(c.id);
    setSelectedCust(c);
    setCustSearch('');
    setCustomers([]);
    setShowCustList(false);
  }

  function clearCustomer() { setCustomerId(''); setSelectedCust(null); setCustSearch(''); }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const discAmt  = parseFloat(discount) || 0;
  const taxAmt   = Math.max(0, (subtotal - discAmt) * taxRate);
  const total    = Math.max(0, subtotal - discAmt + taxAmt);

  function resetPaymentFields() {
    setCashReceived(''); setCheckNumber(''); setCardRef('');
    setSplitCash(''); setSplitCard('');
  }

  function selectMethod(key, currentTotal) {
    setPaymentMethod(key);
    resetPaymentFields();
    if (key === 'split') setSplitCard(currentTotal.toFixed(2));
  }

  async function checkout() {
    if (!cart.length) return toast.error('Cart is empty');
    if (paymentMethod === 'split') {
      const sc = parseFloat(splitCash) || 0;
      const sd = parseFloat(splitCard) || 0;
      if (Math.abs(sc + sd - total) > 0.01) return toast.error(`Split amounts must add up to ${fmt$(total)}`);
    }
    setProcessing(true);
    try {
      const notes = paymentMethod === 'check'
        ? (checkNumber ? `Check #${checkNumber}` : '')
        : paymentMethod === 'card'
        ? (cardRef ? `Ref: ${cardRef}` : '')
        : paymentMethod === 'split'
        ? `Cash: ${fmt$(parseFloat(splitCash)||0)}, Card: ${fmt$(parseFloat(splitCard)||0)}`
        : '';

      const { data } = await api.post('/pos/sale', {
        customerId: customerId || undefined,
        paymentMethod,
        discountAmount: discAmt,
        notes: notes || undefined,
        items: cart.map(i => ({ itemId: i.id, quantity: i.qty, unitPrice: i.unitPrice })),
      });
      setReceipt(data);
      setCart([]);
      setCustomerId('');
      setSelectedCust(null);
      setDiscount('');
      resetPaymentFields();
      toast.success(`Sale ${data.transaction.transactionNumber} complete!`);
      setTimeout(() => searchRef.current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-100">

      {/* ── LEFT: Product Browser ── */}
      <div className={`${mobileView === 'browse' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden`}>

        {/* Customer bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
          <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {selectedCust ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-1.5 text-sm">
              <span className="font-semibold text-green-800">{selectedCust.firstName} {selectedCust.lastName}</span>
              {selectedCust.phone && <span className="text-green-600 text-xs">{selectedCust.phone}</span>}
              <button onClick={clearCustomer} className="text-green-400 hover:text-red-500 ml-1"><XMarkIcon className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="relative flex-1 max-w-xs">
              <input
                className="input text-sm py-1.5"
                placeholder="Search customer (optional)…"
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setShowCustList(true); }}
                onFocus={() => setShowCustList(true)}
              />
              {showCustList && customers.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded shadow-lg z-20">
                  {customers.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 border-b last:border-0">
                      <span className="font-semibold">{c.firstName} {c.lastName}</span>
                      {c.phone && <span className="text-gray-400 text-xs ml-2">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-gray-400 ml-auto">{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</span>
        </div>

        {/* Search + Category tabs */}
        <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-0">
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              className="input pl-9 text-sm"
              placeholder="Search by name, SKU or barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600" onClick={() => setSearch('')}>
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-0 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'border-green-700 text-green-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {catLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          {browseItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <MagnifyingGlassIcon className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">Search for products or select a category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 xl:grid-cols-4">
              {browseItems.map(item => (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="bg-white border border-gray-200 rounded p-3 text-left hover:border-green-600 hover:bg-green-50 transition-colors active:scale-95 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      item.category === 'service' ? 'bg-purple-100 text-purple-700' :
                      item.category === 'device'  ? 'bg-blue-100 text-blue-700' :
                      item.category === 'part'    ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{item.category}</span>
                    {item.category !== 'service' && (
                      <span className={`text-xs font-semibold ${item.quantity <= item.minQuantity ? 'text-red-500' : 'text-gray-400'}`}>
                        {item.quantity} in stock
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-gray-800 leading-tight mb-1 line-clamp-2 group-hover:text-green-800">
                    {item.name}
                  </div>
                  {item.sku && <div className="text-xs text-gray-400 mb-1">{item.sku}</div>}
                  <div className="text-base font-bold text-green-700">{fmt$(item.price)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart + Checkout ── */}
      <div className={`${mobileView === 'cart' ? 'flex w-full' : 'hidden'} md:flex md:w-80 md:flex-shrink-0 bg-white border-l border-gray-200 flex-col overflow-hidden`}>

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Cart</span>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <TrashIcon className="w-3.5 h-3.5" />Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300 text-sm">
              <span className="text-3xl mb-1">🛒</span>
              <span>Cart is empty</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map(item => (
                <div key={item.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="text-xs font-semibold text-gray-800 leading-tight flex-1">{item.name}</div>
                    <button onClick={() => updateQty(item.id, 0)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100">−</button>
                      <span className="px-2 text-sm font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100">+</button>
                    </div>
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-right font-semibold"
                      value={item.unitPrice}
                      onChange={e => updatePrice(item.id, e.target.value)}
                      min="0" step="0.01"
                    />
                    <span className="ml-auto text-sm font-bold text-gray-800">{fmt$(item.unitPrice * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Payment */}
        <div className="border-t border-gray-200 px-4 py-3 pb-20 md:pb-3 space-y-3 overflow-y-auto">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 w-20">Discount $</label>
            <input type="number" className="input text-sm py-1 flex-1" value={discount}
              onChange={e => setDiscount(e.target.value)} min="0" step="0.50" placeholder="0.00" />
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded p-3 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span><span>{fmt$(subtotal)}</span>
            </div>
            {discAmt > 0 && (
              <div className="flex justify-between text-xs text-green-600 font-semibold">
                <span>Discount</span><span>−{fmt$(discAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax (8.25%)</span><span>{fmt$(taxAmt)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 mt-1 pt-1.5">
              <span>TOTAL</span><span className="text-green-700">{fmt$(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">PAYMENT METHOD</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAY_METHODS.map(pm => (
                <button key={pm.key} onClick={() => selectMethod(pm.key, total)}
                  className={`flex flex-col items-center py-2 rounded border text-xs font-bold transition-all ${
                    paymentMethod === pm.key
                      ? pm.color
                      : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-white'
                  }`}>
                  <pm.icon className="w-4 h-4 mb-0.5" />
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Per-method UI */}
          {paymentMethod === 'cash' && (
            <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-green-800 w-24 flex-shrink-0">Cash Received</label>
                <input
                  type="number"
                  className="flex-1 text-sm border border-green-300 rounded px-2 py-1.5 font-semibold text-right bg-white"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  min="0" step="0.01"
                  placeholder={fmt$(total)}
                  autoFocus
                />
              </div>
              {cashReceived !== '' && (
                <div className="flex justify-between items-center pt-1 border-t border-green-200">
                  <span className="text-xs font-bold text-green-800">Change Due</span>
                  <span className={`text-lg font-bold ${(parseFloat(cashReceived) || 0) - total < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {(parseFloat(cashReceived) || 0) - total < 0
                      ? <span className="text-sm text-red-500">Short {fmt$(total - (parseFloat(cashReceived)||0))}</span>
                      : fmt$(Math.max(0, (parseFloat(cashReceived) || 0) - total))
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-blue-800 w-28 flex-shrink-0">Reference # <span className="font-normal opacity-60">(optional)</span></label>
                <input
                  type="text"
                  className="flex-1 text-sm border border-blue-300 rounded px-2 py-1.5 bg-white"
                  value={cardRef}
                  onChange={e => setCardRef(e.target.value)}
                  placeholder="Terminal auth code…"
                />
              </div>
              <p className="text-xs text-blue-600">Swipe / tap card on terminal, then press Charge.</p>
            </div>
          )}

          {paymentMethod === 'check' && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 w-24 flex-shrink-0">Check #</label>
                <input
                  type="text"
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                  value={checkNumber}
                  onChange={e => setCheckNumber(e.target.value)}
                  placeholder="Enter check number…"
                  autoFocus
                />
              </div>
            </div>
          )}

          {paymentMethod === 'split' && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
              <p className="text-xs font-bold text-amber-800 mb-1">Split Payment — Total: {fmt$(total)}</p>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-green-700 w-16 flex-shrink-0">Cash $</label>
                <input
                  type="number"
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                  value={splitCash}
                  onChange={e => {
                    setSplitCash(e.target.value);
                    const rem = total - (parseFloat(e.target.value) || 0);
                    setSplitCard(rem > 0 ? rem.toFixed(2) : '0.00');
                  }}
                  min="0" step="0.01" placeholder="0.00"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-blue-700 w-16 flex-shrink-0">Card $</label>
                <input
                  type="number"
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                  value={splitCard}
                  onChange={e => {
                    setSplitCard(e.target.value);
                    const rem = total - (parseFloat(e.target.value) || 0);
                    setSplitCash(rem > 0 ? rem.toFixed(2) : '0.00');
                  }}
                  min="0" step="0.01" placeholder="0.00"
                />
              </div>
              {(() => {
                const sc = parseFloat(splitCash) || 0;
                const sd = parseFloat(splitCard) || 0;
                const diff = Math.abs(sc + sd - total);
                return diff > 0.01
                  ? <p className="text-xs text-red-500">Amounts don't add up — {fmt$(diff)} remaining</p>
                  : <p className="text-xs text-green-700 font-semibold">✓ Split balanced</p>;
              })()}
            </div>
          )}

          {/* Charge button */}
          <button
            className="w-full py-3 rounded font-bold text-base text-white transition-all disabled:opacity-50"
            style={{ background: cart.length ? '#166534' : '#9ca3af' }}
            onClick={checkout}
            disabled={processing || cart.length === 0}
          >
            {processing ? 'Processing…' : `Charge ${fmt$(total)}`}
          </button>

          {/* Last receipt */}
          {receipt && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-green-800">Sale Complete</span>
                <button className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1">
                  <PrinterIcon className="w-3.5 h-3.5" />Print
                </button>
              </div>
              <div className="text-xs text-green-700">{receipt.transaction?.transactionNumber}</div>
              <div className="text-sm font-bold text-green-800">{fmt$(receipt.total)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden flex border-t border-gray-200 bg-white z-20">
        <button
          onClick={() => setMobileView('browse')}
          className={`flex-1 flex flex-col items-center py-2.5 text-xs font-semibold transition-colors ${
            mobileView === 'browse' ? 'text-green-700' : 'text-gray-500'
          }`}
        >
          <MagnifyingGlassIcon className="w-5 h-5 mb-0.5" />
          Browse
        </button>
        <button
          onClick={() => setMobileView('cart')}
          className={`flex-1 flex flex-col items-center py-2.5 text-xs font-semibold transition-colors relative ${
            mobileView === 'cart' ? 'text-green-700' : 'text-gray-500'
          }`}
        >
          <div className="relative">
            <ShoppingCartIcon className="w-5 h-5 mb-0.5" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                {cart.length}
              </span>
            )}
          </div>
          Cart{cart.length > 0 ? ` (${cart.length})` : ''}
        </button>
      </div>
    </div>
  );
}
