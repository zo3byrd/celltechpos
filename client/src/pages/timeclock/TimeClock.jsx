import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClockIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

function exportPayrollCSV(filterStart, filterEnd) {
  const params = new URLSearchParams();
  if (filterStart) params.set('startDate', filterStart);
  if (filterEnd) params.set('endDate', filterEnd);
  api.get(`/timeclock/payroll/export?${params}`, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }).catch(() => toast.error('Export failed'));
}

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }
function fmtHours(mins) { if (!mins) return '0h 0m'; const h = Math.floor(mins / 60); const m = mins % 60; return `${h}h ${m}m`; }

export default function TimeClock() {
  const { user } = useAuthStore();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const [status, setStatus] = useState(null);
  const [entries, setEntries] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [tab, setTab] = useState('clock');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [breakMins, setBreakMins] = useState('0');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  async function loadStatus() {
    try {
      const { data } = await api.get('/timeclock/status');
      setStatus(data);
    } catch {}
  }

  async function loadEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (filterStart) params.set('startDate', filterStart);
      if (filterEnd) params.set('endDate', filterEnd);
      const { data } = await api.get(`/timeclock/entries?${params}`);
      setEntries(data.entries || []);
    } catch { toast.error('Failed to load entries'); }
    finally { setLoading(false); }
  }

  async function loadPayroll() {
    if (!isAdmin) return;
    try {
      const params = new URLSearchParams();
      if (filterStart) params.set('startDate', filterStart);
      if (filterEnd) params.set('endDate', filterEnd);
      const { data } = await api.get(`/timeclock/payroll?${params}`);
      setPayroll(data);
    } catch {}
  }

  useEffect(() => { loadStatus(); loadEntries(); loadPayroll(); }, [filterStart, filterEnd]);

  useEffect(() => {
    if (!status?.clockedIn || !status?.entry?.clockIn) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(status.entry.clockIn)) / 60000));
    }, 10000);
    setElapsed(Math.floor((Date.now() - new Date(status.entry.clockIn)) / 60000));
    return () => clearInterval(interval);
  }, [status]);

  async function clockIn() {
    setSaving(true);
    try {
      await api.post('/timeclock/clock-in');
      toast.success('Clocked in!');
      loadStatus();
      loadEntries();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function clockOut() {
    setSaving(true);
    try {
      await api.post('/timeclock/clock-out', { breakMins: parseInt(breakMins) || 0 });
      toast.success('Clocked out!');
      setBreakMins('0');
      loadStatus();
      loadEntries();
      loadPayroll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    try {
      await api.put(`/timeclock/entries/${editModal.id}`, editForm);
      toast.success('Updated');
      setEditModal(null);
      loadEntries();
      loadPayroll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="page-title">Time Clock</h1>
        <p className="page-sub">Track work hours and manage payroll</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {['clock', 'entries', ...(isAdmin ? ['payroll'] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'clock' && (
        <div className="max-w-md mx-auto">
          <div className="card text-center space-y-6 py-10">
            <ClockIcon className="w-16 h-16 mx-auto text-brand-500" />
            {status?.clockedIn ? (
              <>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{fmtHours(elapsed)}</div>
                  <div className="text-slate-500 text-sm mt-1">Since {fmtDate(status.entry?.clockIn)}</div>
                </div>
                <div>
                  <label className="label text-center">Break time (minutes)</label>
                  <input type="number" className="input w-28 mx-auto text-center" value={breakMins} onChange={e => setBreakMins(e.target.value)} min="0" />
                </div>
                <button className="btn-danger w-48 justify-center" onClick={clockOut} disabled={saving}>
                  {saving ? 'Processing…' : 'Clock Out'}
                </button>
              </>
            ) : (
              <>
                <div className="text-slate-500">You are currently <strong>clocked out</strong></div>
                <button className="btn-success w-48 justify-center" onClick={clockIn} disabled={saving}>
                  {saving ? 'Processing…' : 'Clock In'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'entries' && (
        <>
          <div className="card py-3 flex gap-3 flex-wrap">
            <div><label className="label text-xs">From</label><input type="date" className="input" value={filterStart} onChange={e => setFilterStart(e.target.value)} /></div>
            <div><label className="label text-xs">To</label><input type="date" className="input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} /></div>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <div className="p-8 text-center text-slate-400">Loading…</div> : entries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No time entries</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="table-th">Employee</th><th className="table-th">Clock In</th><th className="table-th">Clock Out</th>
                  <th className="table-th">Break</th><th className="table-th">Hours</th><th className="table-th">Earnings</th>
                  {isAdmin && <th className="table-th">Actions</th>}
                </tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="table-row">
                      <td className="table-td font-medium">{e.User?.name || 'Unknown'}</td>
                      <td className="table-td">{fmtDate(e.clockIn)}</td>
                      <td className="table-td">{e.clockOut ? fmtDate(e.clockOut) : <span className="badge-green">Active</span>}</td>
                      <td className="table-td">{e.breakMins} min</td>
                      <td className="table-td">{fmtHours(e.totalMins)}</td>
                      <td className="table-td font-semibold">{fmt$(e.earnings)}</td>
                      {isAdmin && (
                        <td className="table-td">
                          <button className="text-brand-600 text-xs hover:underline"
                            onClick={() => {
                              setEditModal(e);
                              setEditForm({
                                clockIn: e.clockIn ? new Date(e.clockIn).toISOString().slice(0, 16) : '',
                                clockOut: e.clockOut ? new Date(e.clockOut).toISOString().slice(0, 16) : '',
                                breakMins: e.breakMins || 0,
                              });
                            }}>Edit</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'payroll' && isAdmin && (
        <>
          <div className="card py-3 flex gap-3 flex-wrap items-end">
            <div><label className="label text-xs">From</label><input type="date" className="input" value={filterStart} onChange={e => setFilterStart(e.target.value)} /></div>
            <div><label className="label text-xs">To</label><input type="date" className="input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} /></div>
            <button className="btn-secondary flex items-center gap-1.5 ml-auto" onClick={() => exportPayrollCSV(filterStart, filterEnd)}>
              <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payroll.map((p, i) => (
              <div key={i} className="card">
                <div className="font-semibold text-slate-900">{p.user?.name || 'Unknown'}</div>
                <div className="text-xs text-slate-500 capitalize mb-3">{p.user?.role?.replace('_', ' ')}</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Total Hours</span><span className="font-medium">{fmtHours(p.totalMins)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Rate</span><span className="font-medium">{fmt$(p.user?.hourlyRate)}/hr</span></div>
                  <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2"><span>Total Pay</span><span className="text-emerald-600">{fmt$(p.totalEarnings)}</span></div>
                </div>
              </div>
            ))}
            {payroll.length === 0 && <div className="col-span-3 card text-center text-slate-500 py-8">No payroll data for selected period</div>}
          </div>
        </>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-semibold">Edit Time Entry</h2>
              <button onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-3">
                <div><label className="label">Clock In</label><input type="datetime-local" className="input" value={editForm.clockIn} onChange={e => setEditForm(f => ({ ...f, clockIn: e.target.value }))} /></div>
                <div><label className="label">Clock Out</label><input type="datetime-local" className="input" value={editForm.clockOut} onChange={e => setEditForm(f => ({ ...f, clockOut: e.target.value }))} /></div>
                <div><label className="label">Break (minutes)</label><input type="number" className="input" value={editForm.breakMins} onChange={e => setEditForm(f => ({ ...f, breakMins: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
