import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const TIER_COLORS = { bronze: 'badge-orange', silver: 'badge-gray', gold: 'badge-yellow', platinum: 'badge-blue' };
const TX_COLORS = { earn: 'badge-green', redeem: 'badge-red', adjust: 'badge-blue', expire: 'badge-gray' };

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }

export default function Loyalty() {
  const [tab, setTab] = useState('lookup');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!search) return setCustomers([]);
    const t = setTimeout(async () => {
      const { data } = await api.get(`/customers?search=${search}&limit=10`);
      setCustomers(data.customers || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function selectCustomer(c) {
    setSelected(c);
    setSearch('');
    setCustomers([]);
    setLoading(true);
    try {
      const { data } = await api.get(`/loyalty/account/${c.id}`);
      setAccount(data.account);
      setTransactions(data.transactions || []);
    } catch { toast.error('Failed to load loyalty account'); }
    finally { setLoading(false); }
  }

  async function loadLeaderboard() {
    try {
      const { data } = await api.get('/loyalty/leaderboard');
      setLeaderboard(data);
    } catch {}
  }

  useEffect(() => { if (tab === 'leaderboard') loadLeaderboard(); }, [tab]);

  async function doAdjust() {
    if (!adjustPoints) return toast.error('Enter points amount');
    setSaving(true);
    try {
      await api.post('/loyalty/adjust', { customerId: selected.id, points: parseInt(adjustPoints), description: adjustNote });
      toast.success('Points adjusted');
      setAdjustModal(false);
      setAdjustPoints('');
      setAdjustNote('');
      selectCustomer(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  const pointValue = account ? (account.points * 0.01).toFixed(2) : '0.00';

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="page-title">Loyalty Program</h1>
        <p className="page-sub">Customer rewards and point tracking</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {['lookup', 'leaderboard'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'lookup' ? 'Customer Lookup' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'lookup' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="card">
            <label className="label">Search Customer</label>
            <div className="relative">
              <input className="input" placeholder="Name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
              {customers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  {customers.map(c => (
                    <button key={c.id} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b last:border-0 text-sm"
                      onClick={() => selectCustomer(c)}>
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-slate-400 text-xs">{c.phone} · {c.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading && <div className="card text-center py-8 text-slate-400">Loading account…</div>}

          {account && selected && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account Card */}
              <div className="card md:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-900">{selected.firstName} {selected.lastName}</div>
                    <div className="text-xs text-slate-500">{selected.phone}</div>
                  </div>
                  <span className={`${TIER_COLORS[account.tier]} capitalize`}>{account.tier}</span>
                </div>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-brand-600">{account.points.toLocaleString()}</div>
                  <div className="text-sm text-slate-500 mt-1">points · {fmt$(pointValue)} value</div>
                </div>
                <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3 mt-3">
                  <div className="flex justify-between"><span className="text-slate-500">Lifetime earned</span><span className="font-medium">{account.lifetimePoints.toLocaleString()}</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1 justify-center text-xs" onClick={() => setAdjustModal(true)}>Adjust Points</button>
                </div>
              </div>

              {/* Transactions */}
              <div className="card md:col-span-2">
                <div className="section-title">Point History</div>
                {transactions.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">No transactions yet</div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                        <div>
                          <div className="font-medium">{t.description || t.type}</div>
                          <div className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={TX_COLORS[t.type]}>{t.type}</span>
                          <span className={`font-semibold ${t.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.points > 0 ? '+' : ''}{t.points}
                          </span>
                          <span className="text-slate-400 text-xs">bal: {t.balance}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selected && !loading && (
            <div className="card text-center py-12">
              <StarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Search for a customer to view their loyalty account</p>
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className="table-th">#</th><th className="table-th">Customer</th><th className="table-th">Tier</th>
              <th className="table-th">Points</th><th className="table-th">Value</th><th className="table-th">Lifetime</th>
            </tr></thead>
            <tbody>
              {leaderboard.map((a, i) => (
                <tr key={a.id} className="table-row">
                  <td className="table-td font-bold text-slate-500">{i + 1}</td>
                  <td className="table-td font-medium">{a.Customer?.firstName} {a.Customer?.lastName}<div className="text-xs text-slate-400">{a.Customer?.phone}</div></td>
                  <td className="table-td"><span className={`${TIER_COLORS[a.tier]} capitalize`}>{a.tier}</span></td>
                  <td className="table-td font-bold text-brand-600">{a.points.toLocaleString()}</td>
                  <td className="table-td">{fmt$(a.points * 0.01)}</td>
                  <td className="table-td text-slate-500">{a.lifetimePoints.toLocaleString()}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No loyalty members yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {adjustModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAdjustModal(false)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-semibold">Adjust Points</h2>
              <button onClick={() => setAdjustModal(false)}><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="modal-body">
              <label className="label">Points (use negative to deduct)</label>
              <input type="number" className="input mb-3" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="+50 or -100" />
              <label className="label">Reason</label>
              <input className="input" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Correction, Bonus" />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAdjustModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={doAdjust} disabled={saving}>{saving ? 'Saving…' : 'Apply Adjustment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
