import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDaysIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

function fmt(d) { return d ? new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }
function fmtHr(d) { return d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'; }
function dur(s, e) { if (!s || !e) return '—'; const m = Math.round((new Date(e) - new Date(s)) / 60000); return `${Math.floor(m/60)}h ${m%60}m`; }

const STATUS_COLORS = { scheduled: 'badge-blue', confirmed: 'badge-green', completed: 'badge-gray', no_show: 'badge-red', cancelled: 'badge-red' };

export default function Shifts() {
  const { user } = useAuthStore();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filterStart, setFilterStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterEnd, setFilterEnd] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [form, setForm] = useState({ userId: '', startTime: '', endTime: '', role: '', notes: '', status: 'scheduled' });

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStart) p.set('start', filterStart);
    if (filterEnd)   p.set('end', filterEnd);
    api.get(`/shifts?${p}`)
      .then(r => setShifts(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filterStart, filterEnd]);
  useEffect(() => { if (isAdmin) api.get('/admin/users').then(r => setStaff(r.data)).catch(() => {}); }, [isAdmin]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function save() {
    try {
      await api.post('/shifts', form);
      toast.success('Shift scheduled');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function remove(id) {
    if (!confirm('Delete this shift?')) return;
    try { await api.delete(`/shifts/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  }

  async function updateStatus(id, status) {
    try { await api.put(`/shifts/${id}`, { status }); load(); } catch { toast.error('Failed'); }
  }

  const byDate = {};
  for (const s of shifts) {
    const d = new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(s);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><CalendarDaysIcon className="w-6 h-6" />Shift Schedule</h1>
          <p className="page-sub">Manage employee shifts and scheduling</p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex items-center gap-1.5" onClick={() => { setForm({ userId: '', startTime: '', endTime: '', role: '', notes: '', status: 'scheduled' }); setModal(true); }}>
            <PlusIcon className="w-4 h-4" /> Schedule Shift
          </button>
        )}
      </div>

      <div className="card py-3 flex gap-3 flex-wrap items-end">
        <div><label className="label text-xs">From</label><input type="date" className="input" value={filterStart} onChange={e => setFilterStart(e.target.value)} /></div>
        <div><label className="label text-xs">To</label><input type="date" className="input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} /></div>
      </div>

      {loading ? (
        <div className="card animate-pulse h-48 bg-gray-100" />
      ) : Object.keys(byDate).length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No shifts scheduled for this period</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([date, dayShifts]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{date}</h2>
              <div className="space-y-2">
                {dayShifts.map(s => (
                  <div key={s.id} className="card py-3 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{s.User?.name || '—'}</span>
                        <span className="text-xs text-gray-400 capitalize">{s.User?.role}</span>
                        {s.role && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.role}</span>}
                        <span className={`${STATUS_COLORS[s.status] || 'badge-gray'} text-xs capitalize`}>{s.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{fmtHr(s.startTime)} – {fmtHr(s.endTime)} <span className="text-gray-400">({dur(s.startTime, s.endTime)})</span></p>
                      {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          className="input text-xs py-1 w-32"
                          value={s.status}
                          onChange={e => updateStatus(s.id, e.target.value)}
                        >
                          {['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'].map(st => (
                            <option key={st} value={st}>{st.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <button className="text-red-400 hover:text-red-600" onClick={() => remove(s.id)}>
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-md">
            <div className="modal-header"><h2 className="font-semibold">Schedule Shift</h2><button onClick={() => setModal(false)}>✕</button></div>
            <div className="modal-body space-y-3">
              <div>
                <label className="label">Employee</label>
                <select className="input" value={form.userId} onChange={e => set('userId', e.target.value)}>
                  <option value="">— Select Employee —</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Start Time</label><input type="datetime-local" className="input" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
                <div><label className="label">End Time</label><input type="datetime-local" className="input" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
              </div>
              <div><label className="label">Role/Position</label><input className="input" placeholder="e.g. Sales, Tech, Cashier" value={form.role} onChange={e => set('role', e.target.value)} /></div>
              <div><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
