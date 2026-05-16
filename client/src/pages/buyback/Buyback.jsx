import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUturnLeftIcon, PlusIcon, XMarkIcon,
  MagnifyingGlassIcon, DevicePhoneMobileIcon,
  CheckCircleIcon, ClockIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
const PAYMENT_METHODS = ['cash', 'check', 'zelle', 'venmo', 'other'];
const STATUSES = ['completed', 'pending', 'declined'];

const emptyForm = {
  customerId: '',
  deviceBrand: '',
  deviceModel: '',
  deviceColor: '',
  imei: '',
  storage: '',
  condition: 'good',
  quotedPrice: '',
  finalPrice: '',
  paymentMethod: 'cash',
  status: 'completed',
  addToInventory: true,
  notes: '',
};

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

function StatusBadge({ status }) {
  const map = {
    completed: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', icon: CheckCircleIcon, label: 'Completed' },
    pending:   { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', icon: ClockIcon,        label: 'Pending' },
    declined:  { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', icon: XCircleIcon,      label: 'Declined' },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
      <Icon style={{ width: 12, height: 12 }} /> {s.label}
    </span>
  );
}

function ConditionBadge({ condition }) {
  const map = { excellent: '#34d399', good: '#60a5fa', fair: '#fbbf24', poor: '#f87171' };
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: map[condition] || '#94a3b8', textTransform: 'capitalize' }}>
      {condition || '—'}
    </span>
  );
}

export default function Buyback() {
  const [buybacks, setBuybacks] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [page, setPage] = useState(0);
  const PER = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PER, offset: page * PER });
      if (filterStatus) params.set('status', filterStatus);
      const [bbRes, statsRes] = await Promise.all([
        api.get(`/buyback?${params}`),
        api.get('/buyback/stats/summary'),
      ]);
      setBuybacks(bbRes.data.buybacks || []);
      setTotal(bbRes.data.total || 0);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load buybacks');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function searchCustomers(q) {
    if (!q || q.length < 2) { setCustResults([]); return; }
    try {
      const r = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=8`);
      setCustResults(r.data.customers || []);
    } catch { setCustResults([]); }
  }

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(custSearch), 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  function openNew() {
    setForm(emptyForm);
    setCustSearch('');
    setCustResults([]);
    setModal(true);
  }

  function f(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    if (!form.deviceBrand || !form.deviceModel) {
      toast.error('Device brand and model are required');
      return;
    }
    if (!form.finalPrice || parseFloat(form.finalPrice) <= 0) {
      toast.error('Enter a valid final price');
      return;
    }
    setSaving(true);
    try {
      await api.post('/buyback', form);
      toast.success('Buyback recorded!');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const displayed = buybacks.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.ticketNumber?.toLowerCase().includes(s) ||
      b.deviceBrand?.toLowerCase().includes(s) ||
      b.deviceModel?.toLowerCase().includes(s) ||
      b.Customer?.firstName?.toLowerCase().includes(s) ||
      b.Customer?.lastName?.toLowerCase().includes(s) ||
      b.imei?.includes(s)
    );
  });

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowUturnLeftIcon style={{ width: 20, height: 20, color: '#2dd4bf' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Buyback</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Purchase used devices from customers</p>
          </div>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <PlusIcon style={{ width: 16, height: 16 }} /> New Buyback
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Buybacks', value: stats.total || 0, color: '#60a5fa' },
            { label: 'Total Paid Out', value: fmt$(stats.totalPaid), color: '#34d399' },
            { label: 'Completed', value: stats.completed || 0, color: '#a78bfa' },
            { label: 'Last 30 Days', value: stats.last30 || 0, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', borderRadius: 10, padding: '16px 18px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <MagnifyingGlassIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748b' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticket, device, customer, IMEI…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
          style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13 }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Ticket', 'Device', 'Customer', 'IMEI', 'Condition', 'Paid', 'Payment', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 48, textAlign: 'center' }}>
                  <DevicePhoneMobileIcon style={{ width: 36, height: 36, color: '#334155', margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ color: '#475569', fontSize: 14 }}>No buybacks yet. Click <strong style={{ color: '#2dd4bf' }}>New Buyback</strong> to get started.</div>
                </td>
              </tr>
            ) : displayed.map((b, i) => (
              <tr key={b.id} style={{ borderTop: '1px solid #0f172a', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{b.ticketNumber}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600 }}>{b.deviceBrand} {b.deviceModel}</div>
                  {(b.deviceColor || b.storage) && <div style={{ fontSize: 11, color: '#64748b' }}>{[b.deviceColor, b.storage].filter(Boolean).join(' · ')}</div>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {b.Customer ? `${b.Customer.firstName} ${b.Customer.lastName}` : '—'}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{b.imei || '—'}</td>
                <td style={{ padding: '10px 14px' }}><ConditionBadge condition={b.condition} /></td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>{fmt$(b.finalPrice)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{b.paymentMethod || '—'}</td>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={b.status} /></td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > PER && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #0f172a' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{total} total · showing {page * PER + 1}–{Math.min((page + 1) * PER, total)}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: page === 0 ? '#334155' : '#e2e8f0', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 12 }}>Prev</button>
              <button disabled={(page + 1) * PER >= total} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: (page + 1) * PER >= total ? '#334155' : '#e2e8f0', cursor: (page + 1) * PER >= total ? 'not-allowed' : 'pointer', fontSize: 12 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ArrowUturnLeftIcon style={{ width: 18, height: 18, color: '#2dd4bf' }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>New Buyback</span>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={save} style={{ padding: '20px 22px' }}>
              {/* Customer search */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Customer (optional)</label>
                <input
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); if (!e.target.value) { f('customerId', ''); } }}
                  placeholder="Search by name or phone…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}
                />
                {custResults.length > 0 && (
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                    {custResults.map(c => (
                      <div key={c.id} onClick={() => { f('customerId', c.id); setCustSearch(`${c.firstName} ${c.lastName}`); setCustResults([]); }}
                        style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid #1e293b' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <strong>{c.firstName} {c.lastName}</strong> <span style={{ color: '#64748b' }}>· {c.phone || c.email || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device info */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Device Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Brand *</label>
                  <input value={form.deviceBrand} onChange={e => f('deviceBrand', e.target.value)} placeholder="e.g. Apple" required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Model *</label>
                  <input value={form.deviceModel} onChange={e => f('deviceModel', e.target.value)} placeholder="e.g. iPhone 14" required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Color</label>
                  <input value={form.deviceColor} onChange={e => f('deviceColor', e.target.value)} placeholder="e.g. Midnight Black"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Storage</label>
                  <input value={form.storage} onChange={e => f('storage', e.target.value)} placeholder="e.g. 128GB"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>IMEI / Serial</label>
                <input value={form.imei} onChange={e => f('imei', e.target.value)} placeholder="15-digit IMEI or serial number"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Condition</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CONDITIONS.map(c => (
                    <button key={c} type="button" onClick={() => f('condition', c)}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${form.condition === c ? '#0d9488' : '#334155'}`, background: form.condition === c ? 'rgba(13,148,136,0.2)' : '#0f172a', color: form.condition === c ? '#2dd4bf' : '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Pricing & Payment</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Quoted Price</label>
                  <input type="number" min="0" step="0.01" value={form.quotedPrice} onChange={e => f('quotedPrice', e.target.value)} placeholder="0.00"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Final Price *</label>
                  <input type="number" min="0" step="0.01" value={form.finalPrice} onChange={e => f('finalPrice', e.target.value)} placeholder="0.00" required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: `1px solid ${form.finalPrice ? '#0d9488' : '#334155'}`, color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Payment Method</label>
                  <select value={form.paymentMethod} onChange={e => f('paymentMethod', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={form.status} onChange={e => f('status', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Add to inventory toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14, padding: '12px 14px', borderRadius: 9, background: form.addToInventory ? 'rgba(13,148,136,0.1)' : '#0f172a', border: `1px solid ${form.addToInventory ? 'rgba(13,148,136,0.3)' : '#334155'}`, transition: 'all 0.15s' }}>
                <input type="checkbox" checked={form.addToInventory} onChange={e => f('addToInventory', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0d9488', cursor: 'pointer' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Add to Inventory</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Device will appear in inventory with 30% markup sell price</div>
                </div>
              </label>

              {/* Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} placeholder="Cosmetic condition details, accessories included, etc."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(false)} style={{ padding: '9px 18px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Record Buyback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
