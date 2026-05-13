import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDaysIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
const SOURCES  = ['phone', 'walk_in', 'online', 'other'];
const DEVICE_TYPES = ['Phone', 'Tablet', 'Laptop', 'Watch', 'Other'];

const STATUS_COLORS = {
  scheduled:   'badge-blue',
  confirmed:   'badge-sky',
  in_progress: 'badge-yellow',
  completed:   'badge-green',
  cancelled:   'badge-gray',
  no_show:     'badge-red',
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const empty = {
  title: '', scheduledAt: '', duration: 60, status: 'scheduled', source: 'phone',
  customerName: '', customerPhone: '', customerEmail: '',
  deviceType: '', deviceBrand: '', deviceModel: '', issueDescription: '', notes: '',
};

export default function Appointments() {
  const [appts, setAppts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filterStatus) params.set('status', filterStatus);
      if (filterDate) params.set('date', filterDate);
      if (search) params.set('search', search);
      const { data } = await api.get(`/appointments?${params}`);
      setAppts(data.appointments || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterStatus, filterDate, search]);

  function openNew() { setForm(empty); setEditing(null); setModal(true); }
  function openEdit(a) {
    setForm({
      ...a,
      scheduledAt: a.scheduledAt ? new Date(a.scheduledAt).toISOString().slice(0, 16) : '',
    });
    setEditing(a.id);
    setModal(true);
  }

  async function save() {
    if (!form.title || !form.scheduledAt) return toast.error('Title and date are required');
    setSaving(true);
    try {
      if (editing) { await api.put(`/appointments/${editing}`, form); toast.success('Updated'); }
      else { await api.post('/appointments', form); toast.success('Appointment created'); }
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  async function changeStatus(id, status) {
    try { await api.put(`/appointments/${id}`, { status }); load(); }
    catch { toast.error('Failed to update'); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-sub">{total} total · schedule and track service appointments</p>
        </div>
        <button className="btn-primary" onClick={openNew}><PlusIcon className="w-4 h-4" />New Appointment</button>
      </div>

      {/* Filters */}
      <div className="card py-3 flex flex-wrap gap-3">
        <input className="input w-56" placeholder="Search customer, device…" value={search} onChange={e => setSearch(e.target.value)} />
        <input type="date" className="input w-40" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <select className="input w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="btn-ghost text-xs" onClick={() => { setFilterDate(''); setFilterStatus(''); setSearch(''); }}>Clear</button>
        <button className="btn-secondary text-xs ml-auto" onClick={() => setFilterDate(today)}>Today</button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : appts.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDaysIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-slate-500">No appointments found</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-th">Date & Time</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Title / Device</th>
                <th className="table-th">Duration</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appts.map(a => (
                <tr key={a.id} className="table-row">
                  <td className="table-td font-medium">{fmt(a.scheduledAt)}</td>
                  <td className="table-td">
                    <div className="font-medium">{a.Customer ? `${a.Customer.firstName} ${a.Customer.lastName}` : (a.customerName || 'Walk-in')}</div>
                    <div className="text-xs text-slate-400">{a.customerPhone || a.Customer?.phone}</div>
                  </td>
                  <td className="table-td">
                    <div>{a.title}</div>
                    {a.deviceBrand && <div className="text-xs text-slate-400">{a.deviceBrand} {a.deviceModel}</div>}
                  </td>
                  <td className="table-td">{a.duration} min</td>
                  <td className="table-td">
                    <select
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      value={a.status}
                      onChange={e => changeStatus(a.id, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="table-td">
                    <button className="text-brand-600 hover:text-brand-800 text-xs font-medium" onClick={() => openEdit(a)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-semibold text-slate-900">{editing ? 'Edit Appointment' : 'New Appointment'}</h2>
              <button onClick={() => setModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Title *</label>
                  <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Screen Replacement" />
                </div>
                <div>
                  <label className="label">Date & Time *</label>
                  <input type="datetime-local" className="input" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input type="number" className="input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} min="15" step="15" />
                </div>
                <div>
                  <label className="label">Customer Name</label>
                  <input className="input" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Device Brand</label>
                  <input className="input" value={form.deviceBrand} onChange={e => setForm(f => ({ ...f, deviceBrand: e.target.value }))} placeholder="Apple, Samsung…" />
                </div>
                <div>
                  <label className="label">Device Model</label>
                  <input className="input" value={form.deviceModel} onChange={e => setForm(f => ({ ...f, deviceModel: e.target.value }))} placeholder="iPhone 15, Galaxy S24…" />
                </div>
                <div>
                  <label className="label">Source</label>
                  <select className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Issue Description</label>
                  <textarea className="input" rows={2} value={form.issueDescription} onChange={e => setForm(f => ({ ...f, issueDescription: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Appointment')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
