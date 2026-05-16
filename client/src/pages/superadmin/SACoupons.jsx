import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, TagIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const fmt$ = n => '$' + parseFloat(n || 0).toFixed(2);
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';

const inp = { background: '#1a1f35', border: '1px solid #2a2f50', color: 'white', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', width: '100%', outline: 'none', fontSize: '0.875rem' };
const lbl = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' };

const emptyForm = { code: '', type: 'percent', value: '', maxUses: '', expiresAt: '', description: '' };

export default function SACoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/coupons').then(r => setCoupons(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }

  useEffect(load, []);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function save() {
    if (!form.code || !form.value) return toast.error('Code and value are required');
    setSaving(true);
    try {
      await api.post('/coupons', form);
      toast.success('Coupon created');
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function toggleActive(coupon) {
    try {
      await api.put(`/coupons/${coupon.id}`, { active: !coupon.active });
      toast.success(coupon.active ? 'Coupon deactivated' : 'Coupon activated');
      load();
    } catch { toast.error('Failed'); }
  }

  async function remove(coupon) {
    if (!window.confirm(`Deactivate coupon ${coupon.code}?`)) return;
    try {
      await api.delete(`/coupons/${coupon.id}`);
      toast.success('Deactivated');
      load();
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TagIcon className="w-6 h-6" style={{ color: '#818cf8' }} />Coupon Codes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Create and manage promo / discount codes</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <PlusIcon className="w-4 h-4" />New Coupon
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2240' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e2240' }}>
          <span className="text-sm font-bold text-white">All Coupons</span>
          <span className="text-xs" style={{ color: '#4b5563' }}>{coupons.length} total</span>
        </div>

        {loading ? (
          <div className="p-10 text-center animate-pulse" style={{ color: '#374151' }}>Loading…</div>
        ) : coupons.length === 0 ? (
          <div className="p-10 text-center" style={{ color: '#4b5563' }}>No coupons yet. Create your first promo code.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2240' }}>
                {['Code', 'Type / Value', 'Uses', 'Expires', 'Stripe', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < coupons.length - 1 ? '1px solid #1a1f35' : 'none' }}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-sm" style={{ color: '#a5b4fc' }}>{c.code}</span>
                    {c.description && <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">
                    {c.type === 'percent' ? `${parseFloat(c.value).toFixed(0)}% off` : `${fmt$(c.value)} off`}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>
                    {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ' / ∞'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>{fmtDate(c.expiresAt)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#4b5563' }}>
                    {c.stripeCouponId ? <span style={{ color: '#4ade80' }}>✓ {c.stripeCouponId}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: c.active ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)', color: c.active ? '#4ade80' : '#6b7280', border: `1px solid ${c.active ? 'rgba(34,197,94,0.25)' : 'rgba(107,114,128,0.25)'}` }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(c)} title={c.active ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: c.active ? '#f87171' : '#4ade80' }}>
                        {c.active ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                      </button>
                      <button onClick={() => remove(c)} title="Delete" className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                        <TrashIcon className="w-4 h-4" />
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
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: '#13162a', border: '1px solid #1e2240' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">New Coupon</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label style={lbl}>Code</label>
                <input style={inp} placeholder="e.g. LAUNCH20" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={lbl}>Type</label>
                  <select style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="percent">Percent off (%)</option>
                    <option value="fixed">Fixed amount ($)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Value</label>
                  <input type="number" style={inp} min="0" step={form.type === 'percent' ? '1' : '0.01'}
                    placeholder={form.type === 'percent' ? '20' : '10.00'}
                    value={form.value} onChange={e => set('value', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={lbl}>Max Uses (blank = unlimited)</label>
                  <input type="number" style={inp} min="1" step="1" placeholder="∞"
                    value={form.maxUses} onChange={e => set('maxUses', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Expires</label>
                  <input type="date" style={inp} value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={lbl}>Description (optional)</label>
                <input style={inp} placeholder="e.g. Launch promo for first 30 days" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <p className="text-xs" style={{ color: '#4b5563' }}>
                If Stripe is configured, the coupon will also be created in Stripe automatically so it can be applied at checkout.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: '#1a1f35', color: '#9ca3af', border: '1px solid #2a2f50' }}>Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
