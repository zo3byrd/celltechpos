import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const CATEGORIES = ['rent','utilities','supplies','parts','payroll','marketing','equipment','other'];
const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);

const CAT_COLOR = {
  rent:      'bg-blue-100 text-blue-700',
  utilities: 'bg-cyan-100 text-cyan-700',
  supplies:  'bg-amber-100 text-amber-700',
  parts:     'bg-orange-100 text-orange-700',
  payroll:   'bg-green-100 text-green-700',
  marketing: 'bg-purple-100 text-purple-700',
  equipment: 'bg-indigo-100 text-indigo-700',
  other:     'bg-gray-100 text-gray-600',
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const emptyForm = {
    category: 'supplies', amount: '', description: '',
    vendor: '', date: new Date().toISOString().slice(0, 10), notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCat) params.set('category', filterCat);
    if (dateFrom)  params.set('from', dateFrom);
    if (dateTo)    params.set('to', dateTo);
    api.get(`/expenses?${params}`)
      .then(r => { setExpenses(r.data.expenses || []); setTotal(r.data.total || 0); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [filterCat, dateFrom, dateTo]);

  function openAdd()  { setEditing(null); setForm(emptyForm); setModal(true); }
  function openEdit(e){ setEditing(e); setForm({ category: e.category, amount: e.amount, description: e.description || '', vendor: e.vendor || '', date: e.date, notes: e.notes || '' }); setModal(true); }

  async function save() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, form);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense added');
      }
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    toast.success('Deleted');
    load();
  }

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0),
  })).filter(x => x.total > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Track operating costs and business expenses</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
        <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        {(filterCat || dateFrom || dateTo) && (
          <button className="text-sm text-gray-400 hover:text-gray-700" onClick={() => { setFilterCat(''); setDateFrom(''); setDateTo(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:col-span-1">
          <p className="text-xs text-gray-400 font-medium">Total Shown</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt$(total)}</p>
        </div>
        {byCategory.slice(0, 3).map(x => (
          <div key={x.cat} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium capitalize">{x.cat}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt$(x.total)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Date','Category','Description','Vendor','Amount','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No expenses found</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="table-td text-gray-500 whitespace-nowrap">{new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className="table-td">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[e.category]}`}>{e.category}</span>
                </td>
                <td className="table-td font-medium text-gray-800">{e.description || '—'}</td>
                <td className="table-td text-gray-500">{e.vendor || '—'}</td>
                <td className="table-td font-bold text-red-600">{fmt$(e.amount)}</td>
                <td className="table-td">
                  <div className="flex gap-3">
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => openEdit(e)}>Edit</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => del(e.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" className="input" min="0.01" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Monthly rent payment" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Vendor (optional)</label>
                <input className="input" placeholder="e.g. Office Depot" value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Notes (optional)</label>
                <textarea className="input resize-none h-16" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
