import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { TrophyIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const TYPES = ['revenue', 'repairs', 'activations', 'transactions'];
const PERIODS = ['daily', 'weekly', 'monthly'];

const fmt$ = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal = (type, val) => type === 'revenue' ? fmt$(val) : val?.toLocaleString() || '0';

const COLOR = p => p >= 100 ? 'bg-green-500' : p >= 75 ? 'bg-blue-500' : p >= 50 ? 'bg-yellow-400' : 'bg-red-400';

export default function Goals() {
  const { user } = useAuthStore();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const [goals, setGoals] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: 'revenue', period: 'monthly', target: '', userId: '', startDate: '', endDate: '', notes: '' });

  function load() {
    setLoading(true);
    api.get('/goals/progress').then(r => setGoals(r.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);
  useEffect(() => { if (isAdmin) api.get('/admin/users').then(r => setStaff(r.data)).catch(() => {}); }, [isAdmin]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function save() {
    try {
      await api.post('/goals', form);
      toast.success('Goal created');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function remove(id) {
    if (!confirm('Delete this goal?')) return;
    try { await api.delete(`/goals/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  }

  const storeGoals = goals.filter(g => !g.userId);
  const staffGoals = goals.filter(g => g.userId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><TrophyIcon className="w-6 h-6" />Sales Goals</h1>
          <p className="page-sub">Track progress toward sales targets</p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex items-center gap-1.5" onClick={() => { setForm({ type: 'revenue', period: 'monthly', target: '', userId: '', startDate: '', endDate: '', notes: '' }); setModal(true); }}>
            <PlusIcon className="w-4 h-4" /> Add Goal
          </button>
        )}
      </div>

      {loading ? (
        <div className="card animate-pulse h-48 bg-gray-100" />
      ) : goals.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No goals set yet. Add your first sales goal!</div>
      ) : (
        <div className="space-y-6">
          {storeGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Store Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeGoals.map(g => <GoalCard key={g.id} goal={g} isAdmin={isAdmin} onDelete={remove} />)}
              </div>
            </div>
          )}
          {staffGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Staff Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffGoals.map(g => <GoalCard key={g.id} goal={g} isAdmin={isAdmin} onDelete={remove} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-md">
            <div className="modal-header"><h2 className="font-semibold">New Goal</h2><button onClick={() => setModal(false)}>✕</button></div>
            <div className="modal-body space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                    {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Period</label>
                  <select className="input" value={form.period} onChange={e => set('period', e.target.value)}>
                    {PERIODS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Target {form.type === 'revenue' ? '($)' : '(count)'}</label>
                <input type="number" className="input" step={form.type === 'revenue' ? '0.01' : '1'} value={form.target} onChange={e => set('target', e.target.value)} />
              </div>
              <div>
                <label className="label">Assign to Staff (optional)</label>
                <select className="input" value={form.userId} onChange={e => set('userId', e.target.value)}>
                  <option value="">— Store-wide goal —</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
                <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
              </div>
              <div><label className="label">Notes</label><textarea className="input h-14 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Create Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, isAdmin, onDelete }) {
  const p = Math.round(goal.progress || 0);
  const type = goal.type;
  const target = parseFloat(goal.target);
  const current = parseFloat(goal.current);

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 capitalize">{type} Goal</p>
          <p className="text-xs text-gray-400 capitalize">{goal.period}{goal.User ? ` · ${goal.User.name}` : ' · Store-wide'}</p>
        </div>
        {isAdmin && (
          <button className="text-gray-300 hover:text-red-500" onClick={() => onDelete(goal.id)}>
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-semibold text-gray-800">{fmtVal(type, current)}</span>
          <span className="text-gray-400">/ {fmtVal(type, target)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-3 rounded-full transition-all ${COLOR(p)}`} style={{ width: `${Math.min(p, 100)}%` }} />
        </div>
        <p className={`text-xs mt-1 font-semibold ${p >= 100 ? 'text-green-600' : p >= 75 ? 'text-blue-600' : 'text-gray-500'}`}>
          {p >= 100 ? '🎉 Goal reached!' : `${p}% complete`}
        </p>
      </div>
    </div>
  );
}
