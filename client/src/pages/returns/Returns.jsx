import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const REASONS = [
  'Customer changed mind',
  'Defective / not working',
  'Wrong item sold',
  'Duplicate purchase',
  'Item not as described',
  'Other',
];

const REFUND_METHODS = [
  { value: 'cash',   label: 'Cash' },
  { value: 'card',   label: 'Card' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'check',  label: 'Check' },
];

function fmt(n) { return '$' + parseFloat(n || 0).toFixed(2); }

export default function Returns() {
  const [query, setQuery]         = useState('');
  const [transaction, setTx]      = useState(null);
  const [priorRefunds, setPrior]  = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected]   = useState({});   // itemId → qty
  const [reason, setReason]       = useState(REASONS[0]);
  const [refundMethod, setMethod] = useState('cash');
  const [processing, setProc]     = useState(false);
  const [done, setDone]           = useState(null);

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setTx(null); setPrior([]); setSelected({}); setDone(null);
    try {
      const { data } = await api.get('/pos/transactions', { params: { search: query.trim(), limit: 5 } });
      const txs = (data.transactions || []).filter(t => t.type !== 'refund');
      if (!txs.length) { toast.error('No sale transaction found'); return; }
      const tx = txs[0];
      // Load full transaction with items
      const { data: full } = await api.get(`/pos/transactions/${tx.id}`);
      const { data: refunds } = await api.get(`/pos/transactions/${tx.id}/refunds`);
      setTx(full);
      setPrior(refunds);
      // Default select all items at max refundable qty
      const sel = {};
      for (const item of full.TransactionItems || []) {
        const alreadyQty = refunds.flatMap(r => r.TransactionItems || [])
          .filter(ri => ri.itemId === item.itemId)
          .reduce((s, ri) => s + ri.quantity, 0);
        const max = item.quantity - alreadyQty;
        if (max > 0) sel[item.itemId] = max;
      }
      setSelected(sel);
    } catch { toast.error('Transaction not found'); }
    finally { setSearching(false); }
  }

  function maxRefundable(item) {
    const alreadyQty = priorRefunds.flatMap(r => r.TransactionItems || [])
      .filter(ri => ri.itemId === item.itemId)
      .reduce((s, ri) => s + ri.quantity, 0);
    return item.quantity - alreadyQty;
  }

  function toggle(item) {
    const max = maxRefundable(item);
    if (max === 0) return;
    setSelected(prev => {
      const next = { ...prev };
      if (next[item.itemId]) { delete next[item.itemId]; }
      else { next[item.itemId] = max; }
      return next;
    });
  }

  function setQty(itemId, val) {
    const n = Math.max(0, Math.min(parseInt(val) || 0, maxRefundable(transaction.TransactionItems.find(i => i.itemId === itemId))));
    setSelected(prev => {
      const next = { ...prev };
      if (n === 0) delete next[itemId]; else next[itemId] = n;
      return next;
    });
  }

  const refundItems = Object.entries(selected)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = transaction?.TransactionItems?.find(i => i.itemId === itemId);
      return { itemId, quantity: qty, unitPrice: item?.unitPrice || 0, name: item?.name };
    });

  const refundTotal = refundItems.reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0);

  async function processRefund() {
    if (!refundItems.length) { toast.error('Select at least one item to refund'); return; }
    setProc(true);
    try {
      const { data } = await api.post('/pos/refund', {
        originalTransactionId: transaction.id,
        items: refundItems,
        reason,
        refundMethod,
      });
      setDone(data);
      toast.success(`Refund ${data.refund.transactionNumber} processed`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Refund failed');
    } finally { setProc(false); }
  }

  function reset() {
    setTx(null); setPrior([]); setSelected({}); setDone(null); setQuery('');
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1>
        <p className="text-sm text-gray-500">Look up a sale to process a full or partial refund</p>
      </div>

      {/* Search */}
      <form onSubmit={search} className="flex gap-3">
        <input
          className="input flex-1"
          placeholder="Transaction number (e.g. TXN-12345678) or customer name"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="btn-primary" disabled={searching}>
          {searching ? 'Searching…' : 'Find Sale'}
        </button>
        {transaction && (
          <button type="button" className="btn-secondary" onClick={reset}>Clear</button>
        )}
      </form>

      {/* Refund complete */}
      {done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">✓</div>
            <div>
              <p className="font-semibold text-green-800">Refund Processed</p>
              <p className="text-sm text-green-700">Ref: <strong>{done.refund.transactionNumber}</strong> · {fmt(Math.abs(done.total))} returned via {refundMethod}</p>
            </div>
          </div>
          <button className="btn-secondary text-sm" onClick={reset}>Process Another Return</button>
        </div>
      )}

      {/* Transaction details */}
      {transaction && !done && (
        <div className="space-y-5">
          {/* Transaction header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="font-semibold text-gray-900">{transaction.transactionNumber}</p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {transaction.Customer && ` · ${transaction.Customer.firstName} ${transaction.Customer.lastName}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Original total</p>
                <p className="text-xl font-bold text-gray-900">{fmt(transaction.total)}</p>
                <p className="text-xs text-gray-400 capitalize">{transaction.paymentMethod}</p>
              </div>
            </div>

            {priorRefunds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Prior Refunds</p>
                {priorRefunds.map(r => (
                  <div key={r.id} className="flex justify-between text-sm text-gray-500">
                    <span>{r.transactionNumber} · {r.reason || 'No reason'}</span>
                    <span className="text-red-500">{fmt(Math.abs(r.total))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items to refund */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b">
              <p className="text-sm font-semibold text-gray-700">Select Items to Refund</p>
            </div>
            <div className="divide-y divide-gray-100">
              {(transaction.TransactionItems || []).map(item => {
                const max = maxRefundable(item);
                const qty = selected[item.itemId] || 0;
                const checked = qty > 0;
                return (
                  <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${max === 0 ? 'opacity-40' : ''}`}>
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={checked}
                      disabled={max === 0}
                      onChange={() => toggle(item)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {fmt(item.unitPrice)} each · {item.quantity} sold
                        {max < item.quantity && ` · ${max} refundable`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={max}
                        value={qty}
                        onChange={e => setQty(item.itemId, e.target.value)}
                        disabled={max === 0}
                        className="input w-16 text-center text-sm py-1"
                      />
                    </div>
                    <div className="w-20 text-right">
                      <p className="font-medium text-gray-800 text-sm">{fmt(parseFloat(item.unitPrice) * qty)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund options */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Refund Reason</label>
                <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Refund Method</label>
                <select className="input" value={refundMethod} onChange={e => setMethod(e.target.value)}>
                  {REFUND_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    {refundItems.length} item{refundItems.length !== 1 ? 's' : ''} selected for refund
                  </p>
                  {refundItems.map(i => (
                    <p key={i.itemId} className="text-xs text-gray-400">{i.name} × {i.quantity}</p>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Refund total</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(refundTotal)}</p>
                </div>
              </div>
            </div>

            <button
              className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              onClick={processRefund}
              disabled={processing || refundItems.length === 0}
            >
              {processing ? 'Processing…' : `Process Refund — ${fmt(refundTotal)}`}
            </button>
          </div>
        </div>
      )}

      {!transaction && !done && (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Enter a transaction number or customer name above to find a sale</p>
        </div>
      )}
    </div>
  );
}
