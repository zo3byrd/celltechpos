import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon, XMarkIcon, PlusIcon, ArrowPathIcon,
  NoSymbolIcon, CheckCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);

function StatusBadge({ status, daysLeft }) {
  if (status === 'active' && daysLeft !== null && daysLeft <= 14) {
    return <span className="badge badge-yellow">Expiring soon ({daysLeft}d)</span>;
  }
  const map = {
    active:    'badge-green',
    trial:     'badge-blue',
    expired:   'badge-red',
    suspended: 'badge-orange',
    cancelled: 'badge-gray',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const emptyForm = { storeId: '', plan: 'monthly', price: '', expiresAt: '', notes: '' };
const extendForm = { months: '', years: '', price: '' };

export default function LicenseManager() {
  const [licenses, setLicenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'extend' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [extForm, setExtForm] = useState(extendForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: lics }, { data: s }] = await Promise.all([
        api.get('/licenses'),
        api.get('/licenses/stats/revenue'),
      ]);
      setLicenses(lics);
      setStats(s);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createLicense() {
    if (!form.storeId) return toast.error('Store ID required');
    setSaving(true);
    try {
      await api.post('/licenses', form);
      toast.success('License created');
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function extendLicense() {
    if (!extForm.months && !extForm.years) return toast.error('Enter months or years');
    setSaving(true);
    try {
      await api.post(`/licenses/${selected.storeId}/extend`, extForm);
      toast.success('License extended');
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function toggleSuspend(lic) {
    try {
      await api.post(`/licenses/${lic.storeId}/suspend`);
      toast.success(lic.status === 'suspended' ? 'Account reactivated' : 'Account suspended');
      load();
    } catch { toast.error('Failed'); }
  }

  async function cancelLicense(lic) {
    if (!window.confirm(`Cancel license for ${lic.storeName}? This will block their access.`)) return;
    try {
      await api.delete(`/licenses/${lic.storeId}`);
      toast.success('License cancelled');
      load();
    } catch { toast.error('Failed'); }
  }

  const openExtend = (lic) => { setSelected(lic); setExtForm(extendForm); setModal('extend'); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><ShieldCheckIcon className="w-6 h-6 text-green-700" />License Manager</h1>
          <p className="page-sub">Control store subscriptions — only you can see this</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setModal('create'); }}>
          <PlusIcon className="w-4 h-4" />New License
        </button>
      </div>

      {/* Revenue stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Active Stores" value={stats.activeStores} accent="green" />
          <Stat label="Monthly MRR" value={fmt$(stats.mrr)} accent="green" />
          <Stat label="Annual ARR" value={fmt$(stats.arr)} accent="blue" />
          <Stat label="Expired / Suspended" value={`${stats.expired} / ${stats.suspended}`} accent={stats.expired > 0 ? 'red' : 'gray'} />
        </div>
      )}

      {/* Subscription breakdown */}
      {stats && (
        <div className="flex gap-4">
          {[
            { label: 'Monthly', count: stats.monthly, color: 'bg-blue-100 text-blue-800' },
            { label: 'Yearly', count: stats.yearly, color: 'bg-green-100 text-green-800' },
            { label: 'Trial', count: stats.trial, color: 'bg-amber-100 text-amber-800' },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 px-3 py-1.5 rounded ${p.color} text-sm font-bold`}>
              {p.count} {p.label}
            </div>
          ))}
        </div>
      )}

      {/* Licenses table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-bold text-gray-700">All Stores</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Loading…</div>
        ) : licenses.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No licenses yet — create one to grant access</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Store</th>
                <th className="table-th">Plan</th>
                <th className="table-th">Status</th>
                <th className="table-th">Started</th>
                <th className="table-th">Expires</th>
                <th className="table-th">Price</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(lic => (
                <tr key={lic.id} className="table-row">
                  <td className="table-td">
                    <div className="font-semibold text-gray-800">{lic.storeName}</div>
                    <div className="text-xs text-gray-400">{lic.storeCity}{lic.storeCity && lic.storeState ? ', ' : ''}{lic.storeState}</div>
                  </td>
                  <td className="table-td capitalize">{lic.plan}</td>
                  <td className="table-td"><StatusBadge status={lic.status} daysLeft={lic.daysLeft} /></td>
                  <td className="table-td text-sm">{fmtDate(lic.startedAt)}</td>
                  <td className="table-td">
                    <div className="text-sm">{fmtDate(lic.expiresAt)}</div>
                    {lic.daysLeft !== null && lic.status === 'active' && (
                      <div className={`text-xs font-semibold ${lic.daysLeft <= 14 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {lic.daysLeft > 0 ? `${lic.daysLeft}d left` : 'Expired'}
                      </div>
                    )}
                  </td>
                  <td className="table-td">{lic.price > 0 ? fmt$(lic.price) + '/mo' : '—'}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openExtend(lic)} title="Extend" className="p-1 text-green-700 hover:bg-green-50 rounded" >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleSuspend(lic)} title={lic.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        className={`p-1 rounded ${lic.status === 'suspended' ? 'text-green-700 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}>
                        {lic.status === 'suspended' ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
                      </button>
                      <button onClick={() => cancelLicense(lic)} title="Cancel" className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <NoSymbolIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800">Create License</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Store ID</label>
                  <input className="input font-mono text-xs" value={form.storeId} onChange={e => setForm(f => ({...f, storeId: e.target.value}))} placeholder="UUID from admin panel" />
                </div>
                <div>
                  <label className="label">Plan</label>
                  <select className="input" value={form.plan} onChange={e => setForm(f => ({...f, plan: e.target.value}))}>
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="label">Price ($/period)</label>
                  <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="e.g. 79" min="0" step="1" />
                </div>
                <div className="col-span-2">
                  <label className="label">Expires At</label>
                  <input type="date" className="input" value={form.expiresAt?.slice(0,10)} onChange={e => setForm(f => ({...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : ''}))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Optional notes" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={createLicense} disabled={saving}>{saving ? 'Creating…' : 'Create License'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Extend modal */}
      {modal === 'extend' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="font-bold text-gray-800">Extend — {selected.storeName}</h2>
              <button onClick={() => setModal(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="modal-body">
              <p className="text-xs text-gray-500 mb-3">Current expiry: <strong>{fmtDate(selected.expiresAt)}</strong></p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">+ Months</label>
                  <input type="number" className="input" value={extForm.months} onChange={e => setExtForm(f => ({...f, months: e.target.value, years: ''}))} min="1" max="24" placeholder="e.g. 1" />
                </div>
                <div>
                  <label className="label">+ Years</label>
                  <input type="number" className="input" value={extForm.years} onChange={e => setExtForm(f => ({...f, years: e.target.value, months: ''}))} min="1" max="5" placeholder="e.g. 1" />
                </div>
                <div className="col-span-2">
                  <label className="label">Price Paid ($)</label>
                  <input type="number" className="input" value={extForm.price} onChange={e => setExtForm(f => ({...f, price: e.target.value}))} placeholder="Optional — update price" min="0" step="1" />
                </div>
              </div>
              {(extForm.months || extForm.years) && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                  New expiry: <strong>{(() => {
                    const base = selected.expiresAt && new Date(selected.expiresAt) > new Date() ? new Date(selected.expiresAt) : new Date();
                    if (extForm.months) base.setMonth(base.getMonth() + parseInt(extForm.months));
                    if (extForm.years)  base.setFullYear(base.getFullYear() + parseInt(extForm.years));
                    return base.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  })()}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={extendLicense} disabled={saving}>{saving ? 'Extending…' : 'Extend License'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  const cls = accent === 'green' ? 'text-green-700' : accent === 'blue' ? 'text-blue-700' : accent === 'red' ? 'text-red-600' : 'text-gray-700';
  return (
    <div className="card">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
