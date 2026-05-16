import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const fmt = n => '$' + parseFloat(n || 0).toFixed(2);

const STATUS_COLOR = {
  active:   'bg-green-100 text-green-700',
  depleted: 'bg-gray-100 text-gray-500',
  void:     'bg-red-100 text-red-600',
};

export default function GiftCards() {
  const [cards, setCards]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [checkCode, setCheckCode] = useState('');
  const [checked, setChecked] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({ amount: '', customerId: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');

  function load() {
    setLoading(true);
    api.get('/gift-cards').then(r => { setCards(r.data.cards); setTotal(r.data.total); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  useEffect(() => {
    if (!custSearch.trim()) return setCustomers([]);
    const t = setTimeout(() => {
      api.get(`/customers?search=${custSearch}&limit=8`).then(r => setCustomers(r.data.customers || []));
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  async function sell() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await api.post('/gift-cards', form);
      toast.success('Gift card created');
      setModal(false);
      setForm({ amount: '', customerId: '', note: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function checkBalance() {
    if (!checkCode.trim()) return;
    setChecking(true); setChecked(null);
    try {
      const { data } = await api.get(`/gift-cards/check/${checkCode.trim()}`);
      setChecked(data);
    } catch { toast.error('Card not found'); }
    finally { setChecking(false); }
  }

  async function voidCard(id) {
    if (!confirm('Void this gift card?')) return;
    await api.put(`/gift-cards/${id}/void`);
    toast.success('Card voided');
    load();
  }

  const totalOutstanding = cards.filter(c => c.status === 'active').reduce((s, c) => s + parseFloat(c.balance), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gift Cards</h1>
          <p className="text-sm text-gray-500">Sell and manage store gift cards</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Sell Gift Card</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Issued', value: total },
          { label: 'Active Cards', value: cards.filter(c => c.status === 'active').length },
          { label: 'Outstanding Balance', value: fmt(totalOutstanding) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Balance checker */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Check Gift Card Balance</p>
        <div className="flex gap-3">
          <input className="input flex-1 font-mono uppercase" placeholder="GC____ - ____ - ____"
            value={checkCode} onChange={e => setCheckCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && checkBalance()} />
          <button className="btn-secondary" onClick={checkBalance} disabled={checking}>
            {checking ? 'Checking…' : 'Check'}
          </button>
        </div>
        {checked && (
          <div className={`mt-3 p-4 rounded-lg ${checked.status === 'active' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-gray-800">{checked.code}</p>
                {checked.Customer && <p className="text-xs text-gray-500">{checked.Customer.firstName} {checked.Customer.lastName}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">{fmt(checked.balance)}</p>
                <p className="text-xs text-gray-400">of {fmt(checked.initialBalance)} original</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[checked.status]}`}>{checked.status}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cards table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Code','Customer','Balance','Initial','Status','Sold','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : cards.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No gift cards yet</td></tr>
            ) : cards.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-td font-mono font-bold text-gray-700">{c.code}</td>
                <td className="table-td text-gray-500">{c.Customer ? `${c.Customer.firstName} ${c.Customer.lastName}` : '—'}</td>
                <td className="table-td font-bold text-green-700">{fmt(c.balance)}</td>
                <td className="table-td text-gray-400">{fmt(c.initialBalance)}</td>
                <td className="table-td">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                </td>
                <td className="table-td text-gray-400 whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="table-td">
                  {c.status === 'active' && (
                    <button className="text-xs text-red-500 hover:underline" onClick={() => voidCard(c.id)}>Void</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sell modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Sell Gift Card</h2>
            <div>
              <label className="label">Amount ($)</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[25, 50, 100, 200].map(v => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, amount: String(v) }))}
                    className={`py-2 rounded-lg border text-sm font-bold transition-colors ${form.amount === String(v) ? 'bg-green-700 text-white border-green-700' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
                    ${v}
                  </button>
                ))}
              </div>
              <input type="number" className="input" placeholder="Or enter custom amount…"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="1" step="0.01" />
            </div>
            <div>
              <label className="label">Link to Customer (optional)</label>
              <input className="input mb-1" placeholder="Search customer…" value={custSearch}
                onChange={e => setCustSearch(e.target.value)} />
              {customers.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y">
                  {customers.map(c => (
                    <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-green-50"
                      onClick={() => { setForm(f => ({ ...f, customerId: c.id })); setCustSearch(`${c.firstName} ${c.lastName}`); setCustomers([]); }}>
                      {c.firstName} {c.lastName} {c.phone && <span className="text-gray-400 text-xs ml-1">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <input className="input" placeholder="Birthday gift, referral bonus…" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={sell} disabled={saving}>{saving ? 'Creating…' : 'Create Gift Card'}</button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
