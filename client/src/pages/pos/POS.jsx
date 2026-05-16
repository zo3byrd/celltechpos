import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, XMarkIcon, UserIcon, TrashIcon,
  PrinterIcon, BanknotesIcon, CreditCardIcon, ShoppingCartIcon,
  DevicePhoneMobileIcon, EnvelopeIcon, CheckCircleIcon, GiftIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const CATEGORIES = ['all', 'part', 'accessory', 'device', 'service', 'plan', 'other'];
const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);

const PAY_METHODS = [
  { key: 'cash',      label: 'Cash',  icon: BanknotesIcon,  color: 'bg-green-600 text-white border-green-600' },
  { key: 'card',      label: 'Card',  icon: CreditCardIcon, color: 'bg-blue-600 text-white border-blue-600' },
  { key: 'check',     label: 'Check', icon: BanknotesIcon,  color: 'bg-gray-600 text-white border-gray-600' },
  { key: 'split',     label: 'Split', icon: BanknotesIcon,  color: 'bg-amber-600 text-white border-amber-600' },
  { key: 'gift_card', label: 'Gift',  icon: GiftIcon,       color: 'bg-purple-600 text-white border-purple-600' },
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
  const [giftCardCode, setGiftCardCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [storeInfo, setStoreInfo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptCustomer, setReceiptCustomer] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptAction, setReceiptAction] = useState(null); // 'sms' | 'email'
  const [receiptTo, setReceiptTo] = useState('');
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [mobileView, setMobileView] = useState('browse');
  const searchRef = useRef(null);

  // Load items when search or category changes
  useEffect(() => {
    api.get('/pos/store-info').then(r => setStoreInfo(r.data)).catch(() => {});
  }, []);

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

  const taxRate  = storeInfo ? parseFloat(storeInfo.taxRate) : 0.0825;
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const discAmt  = parseFloat(discount) || 0;
  const taxAmt   = Math.max(0, (subtotal - discAmt) * taxRate);
  const total    = Math.max(0, subtotal - discAmt + taxAmt);

  function resetPaymentFields() {
    setCashReceived(''); setCheckNumber(''); setCardRef('');
    setSplitCash(''); setSplitCard(''); setGiftCardCode('');
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
    if (paymentMethod === 'gift_card' && !giftCardCode.trim()) {
      return toast.error('Enter the gift card code');
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
        giftCardCode: paymentMethod === 'gift_card' ? giftCardCode.trim().toUpperCase() : undefined,
        discountAmount: discAmt,
        notes: notes || undefined,
        items: cart.map(i => ({ itemId: i.id, quantity: i.qty, unitPrice: i.unitPrice })),
      });
      setReceiptItems(cart.map(i => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })));
      setReceiptCustomer(selectedCust);
      setReceipt(data);
      setReceiptAction(null);
      setReceiptTo('');
      setShowReceiptModal(true);
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

  async function sendReceiptDelivery() {
    if (!receipt || !receiptTo.trim()) return;
    setSendingReceipt(true);
    try {
      await api.post('/pos/send-receipt', {
        method: receiptAction,
        to: receiptTo.trim(),
        transactionNumber: receipt.transaction.transactionNumber,
        storeName: storeInfo?.name,
        storeAddress: [storeInfo?.address, storeInfo?.city, storeInfo?.state, storeInfo?.zip].filter(Boolean).join(', '),
        storePhone: storeInfo?.phone,
        logoUrl: storeInfo?.logoUrl,
        receiptPolicy: storeInfo?.receiptPolicy,
        items: receiptItems,
        subtotal: receipt.subtotal,
        taxAmount: receipt.taxAmount,
        discountAmount: receipt.transaction.discountAmount,
        total: receipt.total,
        paymentMethod: receipt.transaction.paymentMethod,
      });
      toast.success(`Receipt sent via ${receiptAction === 'sms' ? 'text message' : 'email'}!`);
      setReceiptAction(null);
      setReceiptTo('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send receipt');
    } finally {
      setSendingReceipt(false);
    }
  }

  function printReceipt() {
    if (!receipt) return;
    const tx = receipt.transaction;
    const storeName = storeInfo?.name || 'Receipt';
    const storeAddr = [storeInfo?.address, storeInfo?.city, storeInfo?.state, storeInfo?.zip].filter(Boolean).join(', ');
    const storePhone = storeInfo?.phone || '';
    const logoUrl = storeInfo?.logoUrl || '';
    const policy = storeInfo?.receiptPolicy || 'Thank you for your business!';

    const rows = receiptItems.map(i =>
      `<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${fmt$(i.unitPrice * i.qty)}</td></tr>`
    ).join('');
    const cashBack = tx.paymentMethod === 'cash' && parseFloat(cashReceived)
      ? `<tr><td colspan="2">Cash received</td><td style="text-align:right">${fmt$(cashReceived)}</td></tr>
         <tr><td colspan="2"><b>Change due</b></td><td style="text-align:right"><b>${fmt$(parseFloat(cashReceived) - receipt.total)}</b></td></tr>`
      : '';

    const logoHtml = logoUrl
      ? `<div style="text-align:center;margin-bottom:8px"><img src="${logoUrl}" alt="${storeName}" style="max-height:72px;max-width:180px;object-fit:contain"/></div>`
      : '';
    const policyHtml = `<p style="text-align:center;font-size:11px;margin-top:8px;white-space:pre-wrap">${policy}</p>`;

    const existing = document.getElementById('__receipt_frame__');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__receipt_frame__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:320px;height:600px;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  body{font-family:monospace;font-size:13px;width:300px;margin:0 auto;padding:16px}
  h2{text-align:center;margin:0 0 4px}
  p{text-align:center;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  td{padding:2px 0}
  hr{border:none;border-top:1px dashed #000;margin:6px 0}
</style></head><body>
${logoHtml}
<h2>${storeName}</h2>
${storeAddr ? `<p>${storeAddr}</p>` : ''}
${storePhone ? `<p>${storePhone}</p>` : ''}
<p>Receipt #${tx.transactionNumber}</p>
<p>${new Date().toLocaleString()}</p>
<hr/>
<table>
  <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<hr/>
<table>
  <tr><td colspan="2">Subtotal</td><td style="text-align:right">${fmt$(receipt.subtotal)}</td></tr>
  ${tx.discountAmount > 0 ? `<tr><td colspan="2">Discount</td><td style="text-align:right">-${fmt$(tx.discountAmount)}</td></tr>` : ''}
  <tr><td colspan="2">Tax</td><td style="text-align:right">${fmt$(receipt.taxAmount)}</td></tr>
  <tr><td colspan="2"><b>Total</b></td><td style="text-align:right"><b>${fmt$(receipt.total)}</b></td></tr>
  <tr><td colspan="2">Payment</td><td style="text-align:right">${tx.paymentMethod}</td></tr>
  ${cashBack}
</table>
<hr/>
${policyHtml}
</body></html>`);
    doc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
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
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-gray-400 hidden sm:inline">Cart</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cart.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {cart.length}
            </span>
          </div>
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
          <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap flex-shrink-0 ${
                  category === cat
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              {browseItems.map(item => {
                const catColors = {
                  service:   { bg: 'from-purple-500 to-indigo-600', icon: '🔧', badge: 'bg-purple-100 text-purple-700' },
                  device:    { bg: 'from-blue-500 to-cyan-600',     icon: '📱', badge: 'bg-blue-100 text-blue-700' },
                  part:      { bg: 'from-amber-400 to-orange-500',  icon: '⚙️', badge: 'bg-amber-100 text-amber-700' },
                  plan:      { bg: 'from-teal-400 to-green-500',    icon: '📶', badge: 'bg-teal-100 text-teal-700' },
                  accessory: { bg: 'from-pink-400 to-rose-500',     icon: '🎧', badge: 'bg-pink-100 text-pink-700' },
                  other:     { bg: 'from-gray-400 to-slate-500',    icon: '📦', badge: 'bg-gray-100 text-gray-600' },
                };
                const cc = catColors[item.category] || catColors.other;
                return (
                  <button key={item.id} onClick={() => addToCart(item)}
                    className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden text-left hover:border-green-500 hover:shadow-lg transition-all active:scale-95 group flex flex-col">
                    {/* Image / gradient placeholder */}
                    <div className="w-full h-24 flex-shrink-0 overflow-hidden relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                          loading="lazy" />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-br ${cc.bg} flex items-center justify-center text-3xl ${item.imageUrl ? 'hidden' : 'flex'}`}>
                        <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{cc.icon}</span>
                      </div>
                      {/* Stock badge */}
                      {item.category !== 'service' && item.category !== 'plan' && (
                        <span className={`absolute top-1.5 right-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
                          item.quantity <= (item.minQuantity || 1) ? 'bg-red-500 text-white' : 'bg-white/95 text-gray-700'
                        }`}>
                          {item.quantity}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2 flex flex-col flex-1">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full self-start mb-1 ${cc.badge}`}>
                        {item.category}
                      </span>
                      <div className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 group-hover:text-green-800 flex-1 mb-1">
                        {item.name}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="text-sm font-extrabold text-green-700">{fmt$(item.price)}</div>
                        <div className="w-6 h-6 rounded-full bg-green-700 group-hover:bg-green-600 flex items-center justify-center transition-colors">
                          <span className="text-white text-sm font-bold leading-none">+</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart + Checkout ── */}
      <div className={`${mobileView === 'cart' ? 'flex w-full' : 'hidden'} md:flex md:w-96 md:flex-shrink-0 bg-white border-l border-gray-200 flex-col overflow-hidden`}>

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
        <div className="flex-1 min-h-0 overflow-y-auto">
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
        <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 pb-20 md:pb-3 space-y-3 overflow-y-auto" style={{ maxHeight: '62vh' }}>
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
              <span>Tax ({(taxRate * 100).toFixed(2)}%)</span><span>{fmt$(taxAmt)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 mt-1 pt-1.5">
              <span>TOTAL</span><span className="text-green-700">{fmt$(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">PAYMENT METHOD</p>
            <div className="grid grid-cols-5 gap-1.5">
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

          {paymentMethod === 'gift_card' && (
            <div className="bg-purple-50 border border-purple-200 rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-purple-800 w-24 flex-shrink-0">Card Code</label>
                <input
                  type="text"
                  className="flex-1 text-sm border border-purple-300 rounded px-2 py-1.5 bg-white font-mono uppercase tracking-wider"
                  value={giftCardCode}
                  onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                  placeholder="GC____-____-____"
                  autoFocus
                />
              </div>
              <p className="text-xs text-purple-600">Enter the gift card code printed on the card.</p>
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

          {/* Last receipt — compact reprint link */}
          {receipt && (
            <button onClick={() => setShowReceiptModal(true)}
              className="w-full text-xs text-green-700 hover:text-green-900 flex items-center justify-center gap-1.5 py-1 rounded hover:bg-green-50 transition-colors">
              <PrinterIcon className="w-3.5 h-3.5" />
              {receipt.transaction?.transactionNumber} — reprint / resend
            </button>
          )}
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {showReceiptModal && receipt && (
        <div className="modal-overlay" onClick={() => { setShowReceiptModal(false); setReceiptAction(null); }}>
          <div className="modal-box max-w-sm w-full" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-bold text-gray-900">Sale Complete</div>
                  <div className="text-xs text-gray-500">{receipt.transaction?.transactionNumber}</div>
                </div>
              </div>
              <button onClick={() => { setShowReceiptModal(false); setReceiptAction(null); }}
                className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* Item list */}
              <div className="text-sm space-y-1.5">
                {receiptItems.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.qty}</span></span>
                    <span className="font-semibold text-gray-800">{fmt$(item.unitPrice * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt$(receipt.subtotal)}</span></div>
                {receipt.transaction.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600"><span>Discount</span><span>−{fmt$(receipt.transaction.discountAmount)}</span></div>
                )}
                <div className="flex justify-between text-gray-500"><span>Tax</span><span>{fmt$(receipt.taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1.5 mt-1">
                  <span>Total</span><span className="text-green-700">{fmt$(receipt.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Payment</span><span className="capitalize">{receipt.transaction.paymentMethod}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { printReceipt(); }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all font-semibold text-sm text-gray-700">
                  <PrinterIcon className="w-6 h-6" />
                  Print
                </button>
                <button
                  onClick={() => { setReceiptAction('sms'); setReceiptTo(receiptCustomer?.phone || ''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all font-semibold text-sm ${
                    receiptAction === 'sms' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700'
                  }`}>
                  <DevicePhoneMobileIcon className="w-6 h-6" />
                  Text
                </button>
                <button
                  onClick={() => { setReceiptAction('email'); setReceiptTo(receiptCustomer?.email || ''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all font-semibold text-sm ${
                    receiptAction === 'email' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-gray-700'
                  }`}>
                  <EnvelopeIcon className="w-6 h-6" />
                  Email
                </button>
              </div>

              {/* SMS / Email input */}
              {receiptAction && (
                <div className="space-y-2">
                  <label className="label">
                    {receiptAction === 'sms' ? 'Phone number' : 'Email address'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={receiptAction === 'sms' ? 'tel' : 'email'}
                      className="input flex-1"
                      placeholder={receiptAction === 'sms' ? '+1 (555) 000-0000' : 'customer@email.com'}
                      value={receiptTo}
                      onChange={e => setReceiptTo(e.target.value)}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && sendReceiptDelivery()}
                    />
                    <button
                      onClick={sendReceiptDelivery}
                      disabled={sendingReceipt || !receiptTo.trim()}
                      className="btn-primary flex-shrink-0">
                      {sendingReceipt ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setShowReceiptModal(false); setReceiptAction(null); }} className="btn-secondary w-full justify-center">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
