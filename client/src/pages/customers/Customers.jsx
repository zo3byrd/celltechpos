import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import MessageModal from '../../components/MessageModal';

function exportCSV(path, filename) {
  api.get(path, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }).catch(() => toast.error('Export failed'));
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [msgCustomer, setMsgCustomer] = useState(null);
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', address:'', city:'', state:'', zip:'', notes:'' });

  function load() {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 20 });
    if (search) p.set('search', search);
    api.get(`/customers?${p}`)
      .then(r => { setCustomers(r.data.customers); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search]);

  async function save() {
    try {
      await api.post('/customers', form);
      toast.success('Customer added');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  }

  async function openDetail(id) {
    const { data } = await api.get(`/customers/${id}`);
    setDetail(data);
  }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={() => exportCSV('/customers/export/csv', 'customers.csv')}>
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
          <button className="btn-primary" onClick={() => { setForm({ firstName:'', lastName:'', email:'', phone:'', address:'', city:'', state:'', zip:'', notes:'' }); setModal(true); }}>
            + Add Customer
          </button>
        </div>
      </div>

      <input className="input max-w-sm" placeholder="Search name, phone, email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>{['Name','Phone','Email','City','Repairs','Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={6}><div className="h-4 m-3 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{c.firstName} {c.lastName}</td>
                <td className="table-td">{c.phone || '—'}</td>
                <td className="table-td">{c.email || '—'}</td>
                <td className="table-td">{c.city || '—'}</td>
                <td className="table-td">{c.RepairTickets?.length ?? '—'}</td>
                <td className="table-td flex items-center gap-2">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => openDetail(c.id)}>View</button>
                  <button className="text-xs text-green-600 hover:underline" onClick={() => setMsgCustomer(c)}>Message</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {Math.ceil(total / 20)}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>Next</button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Add Customer</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['firstName','First Name'],['lastName','Last Name'],['phone','Phone'],['email','Email'],
                ['address','Address'],['city','City'],['state','State'],['zip','ZIP']].map(([f, lbl]) => (
                <div key={f} className={['address','email'].includes(f) ? 'col-span-2' : ''}>
                  <label className="label">{lbl}</label>
                  <input className="input" value={form[f]} onChange={e => set(f, e.target.value)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={save}>Save</button>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {msgCustomer && (
        <MessageModal customer={msgCustomer} onClose={() => setMsgCustomer(null)} />
      )}

      {/* Detail Panel */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{detail.firstName} {detail.lastName}</h2>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-800"
                  onClick={() => setMsgCustomer(detail)}
                >
                  Send Message
                </button>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setDetail(null)}>✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Phone:</span> {detail.phone || '—'}</div>
              <div><span className="text-gray-500">Email:</span> {detail.email || '—'}</div>
              <div><span className="text-gray-500">Address:</span> {[detail.address, detail.city, detail.state, detail.zip].filter(Boolean).join(', ') || '—'}</div>
            </div>
            {detail.RepairTickets?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Recent Repairs</h3>
                <div className="space-y-1">
                  {detail.RepairTickets.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-mono text-xs text-brand-600">{t.ticketNumber}</span>
                      <span>{t.deviceBrand} {t.deviceModel}</span>
                      <span className="badge badge-gray">{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
