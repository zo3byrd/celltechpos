import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon, PlusIcon, XMarkIcon, BoltIcon,
  PauseIcon, PlayIcon, TrashIcon, CheckCircleIcon,
  ClockIcon, ExclamationCircleIcon, ChevronDownIcon,
  ChevronUpIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const FREQUENCIES = [
  { value: 'weekly',    label: 'Weekly',    days: 7  },
  { value: 'monthly',   label: 'Monthly',   days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'yearly',    label: 'Yearly',    days: 365 },
];

const FREQ_COLOR = {
  weekly:    { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  monthly:   { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  quarterly: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  yearly:    { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
};

const INV_STATUS_COLOR = {
  draft:   { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  sent:    { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  paid:    { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  overdue: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  void:    { bg: 'rgba(100,116,139,0.1)',  color: '#475569' },
};

const emptyLine = { description: '', qty: 1, unitPrice: '' };

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString(); }

function isDue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T12:00:00') <= new Date();
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr + 'T12:00:00') - new Date()) / 86400000);
  return diff;
}

// ── Invoice history for one recurring plan ────────────────────────────────────
function InvoiceHistory({ recurringId, onPay }) {
  const [invs, setInvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/recurring/${recurringId}/invoices`)
      .then(r => setInvs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [recurringId]);

  if (loading) return <div style={{ padding: '8px 16px', color: '#64748b', fontSize: 13 }}>Loading…</div>;
  if (invs.length === 0) return <div style={{ padding: '10px 16px', color: '#475569', fontSize: 13, fontStyle: 'italic' }}>No invoices generated yet.</div>;

  return (
    <div style={{ borderTop: '1px solid #1e293b' }}>
      {invs.map((inv, i) => {
        const sc = INV_STATUS_COLOR[inv.status] || INV_STATUS_COLOR.draft;
        return (
          <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', fontFamily: 'monospace' }}>{inv.invoiceNumber}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{inv.status}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Created {fmtDate(inv.createdAt)} · Due {fmtDate(inv.dueDate)}
                {inv.paidAt && ` · Paid ${fmtDate(inv.paidAt)}`}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{fmt$(inv.total)}</div>
            {inv.status !== 'paid' && inv.status !== 'void' && (
              <button
                onClick={() => onPay(inv)}
                style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Mark Paid
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecurringInvoices() {
  const [recurring, setRecurring] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [billing, setBilling] = useState(null);
  const [paying, setPaying] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  // Form state
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [form, setForm] = useState({ customerId: '', name: '', frequency: 'monthly', startDate: '', dueDays: '30', taxRate: '0', notes: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/recurring');
      setRecurring(r.data.recurring || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (custSearch.length < 2) return setCustResults([]);
      const r = await api.get(`/customers?search=${encodeURIComponent(custSearch)}&limit=8`).catch(() => null);
      setCustResults(r?.data?.customers || []);
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  function openNew() {
    setForm({ customerId: '', name: '', frequency: 'monthly', startDate: new Date().toISOString().slice(0,10), dueDays: '30', taxRate: '0', notes: '' });
    setLines([{ ...emptyLine }]);
    setCustSearch(''); setCustResults([]);
    setModal(true);
  }

  function setLine(i, k, v) { setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l)); }
  function addLine() { setLines(ls => [...ls, { ...emptyLine }]); }
  function removeLine(i) { setLines(ls => ls.filter((_, idx) => idx !== i)); }

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.qty || 1) * parseFloat(l.unitPrice || 0)), 0);
  const taxAmt = subtotal * (parseFloat(form.taxRate || 0) / 100);
  const totalCalc = subtotal + taxAmt;

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Give this contract a name'); return; }
    if (!lines.some(l => l.description && l.unitPrice)) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    try {
      await api.post('/recurring', {
        ...form,
        taxRate: parseFloat(form.taxRate || 0) / 100,
        lineItems: lines.filter(l => l.description),
        dueDays: parseInt(form.dueDays || 30),
      });
      toast.success('Recurring invoice created');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  async function billNow(item) {
    setBilling(item.id);
    try {
      const r = await api.post(`/recurring/${item.id}/bill-now`);
      toast.success(`Invoice ${r.data.invoice.invoiceNumber} generated`);
      load();
      setExpanded(item.id); // open history to show new invoice
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBilling(null); }
  }

  async function toggleStatus(item) {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    await api.put(`/recurring/${item.id}`, { status: newStatus }).catch(() => null);
    toast.success(newStatus === 'active' ? 'Resumed' : 'Paused');
    load();
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.name}"? This won't delete already-generated invoices.`)) return;
    await api.delete(`/recurring/${item.id}`).catch(() => null);
    toast.success('Deleted');
    load();
  }

  async function markPaid(inv) {
    await api.put(`/recurring/invoices/${inv.id}/pay`, { paymentMethod: payMethod, amount: inv.total }).catch(() => null);
    toast.success('Marked as paid');
    setPaying(null);
    load();
    // Refresh expanded history
    setExpanded(e => { const v = e; return null; });
    setTimeout(() => setExpanded(v => v), 50);
  }

  const dueCount = recurring.filter(r => r.status === 'active' && isDue(r.nextBillingDate)).length;

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowPathIcon style={{ width: 20, height: 20, color: '#34d399' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Recurring Invoices</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {total} active contract{total !== 1 ? 's' : ''}
              {dueCount > 0 && <span style={{ marginLeft: 8, color: '#f87171', fontWeight: 600 }}>· {dueCount} due now</span>}
            </p>
          </div>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <PlusIcon style={{ width: 16, height: 16 }} /> New Contract
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading…</div>
      ) : recurring.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <ArrowPathIcon style={{ width: 40, height: 40, color: '#1e293b', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ color: '#475569', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No recurring invoices yet</div>
          <div style={{ color: '#334155', fontSize: 13 }}>Set up monthly maintenance contracts, service agreements, or any repeating billing.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recurring.map(item => {
            const fc = FREQ_COLOR[item.frequency] || FREQ_COLOR.monthly;
            const due = isDue(item.nextBillingDate) && item.status === 'active';
            const days = daysUntil(item.nextBillingDate);
            const isOpen = expanded === item.id;

            return (
              <div key={item.id} style={{ background: '#1e293b', borderRadius: 12, border: `1px solid ${due ? 'rgba(239,68,68,0.4)' : '#334155'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
                  {/* Frequency badge */}
                  <span style={{ padding: '3px 10px', borderRadius: 999, background: fc.bg, color: fc.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                    {item.frequency}
                  </span>

                  {/* Name + customer */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                      {item.Customer ? `${item.Customer.firstName} ${item.Customer.lastName}` : 'No customer'}
                      {item.billingCount > 0 && ` · ${item.billingCount} invoice${item.billingCount !== 1 ? 's' : ''} sent`}
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>{fmt$(item.total)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>per {item.frequency.replace('quarterly','quarter')}</div>
                  </div>

                  {/* Next billing */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
                    <div style={{ fontSize: 12, color: due ? '#f87171' : '#94a3b8', fontWeight: due ? 700 : 400 }}>
                      {due ? '⚠ Due now' : days !== null ? (days === 0 ? 'Due today' : days > 0 ? `Due in ${days}d` : `${Math.abs(days)}d overdue`) : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{fmtDate(item.nextBillingDate)}</div>
                  </div>

                  {/* Status pill */}
                  <span style={{ padding: '3px 8px', borderRadius: 999, background: item.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: item.status === 'active' ? '#34d399' : '#64748b', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {item.status}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {item.status === 'active' && (
                      <button
                        onClick={() => billNow(item)}
                        disabled={billing === item.id}
                        title="Bill Now"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: due ? '#0d9488' : 'rgba(13,148,136,0.15)', color: due ? '#fff' : '#2dd4bf', border: `1px solid ${due ? 'transparent' : 'rgba(13,148,136,0.3)'}`, fontSize: 12, fontWeight: 600, cursor: billing === item.id ? 'not-allowed' : 'pointer', opacity: billing === item.id ? 0.6 : 1 }}
                      >
                        <BoltIcon style={{ width: 13, height: 13 }} />
                        {billing === item.id ? 'Billing…' : 'Bill Now'}
                      </button>
                    )}
                    <button onClick={() => toggleStatus(item)} title={item.status === 'active' ? 'Pause' : 'Resume'}
                      style={{ padding: '5px 7px', borderRadius: 7, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
                      {item.status === 'active' ? <PauseIcon style={{ width: 13, height: 13 }} /> : <PlayIcon style={{ width: 13, height: 13 }} />}
                    </button>
                    <button onClick={() => deleteItem(item)} title="Delete"
                      style={{ padding: '5px 7px', borderRadius: 7, background: '#0f172a', border: '1px solid #334155', color: '#f87171', cursor: 'pointer' }}>
                      <TrashIcon style={{ width: 13, height: 13 }} />
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : item.id)} title="Invoice history"
                      style={{ padding: '5px 7px', borderRadius: 7, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
                      {isOpen ? <ChevronUpIcon style={{ width: 13, height: 13 }} /> : <ChevronDownIcon style={{ width: 13, height: 13 }} />}
                    </button>
                  </div>
                </div>

                {/* Line items summary */}
                {!isOpen && item.lineItemsJson && (() => {
                  try {
                    const items = JSON.parse(item.lineItemsJson);
                    if (items.length === 0) return null;
                    return (
                      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {items.slice(0, 4).map((l, i) => (
                          <span key={i} style={{ fontSize: 11, color: '#64748b', background: '#0f172a', padding: '2px 8px', borderRadius: 5 }}>
                            {l.description} {l.qty > 1 ? `×${l.qty}` : ''} — {fmt$(l.qty * l.unitPrice)}
                          </span>
                        ))}
                        {items.length > 4 && <span style={{ fontSize: 11, color: '#475569' }}>+{items.length - 4} more</span>}
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* Invoice history accordion */}
                {isOpen && (
                  <InvoiceHistory
                    recurringId={item.id}
                    onPay={inv => { setPaying(inv); setPayMethod('cash'); }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── New Recurring Invoice Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ArrowPathIcon style={{ width: 18, height: 18, color: '#34d399' }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>New Recurring Invoice</span>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={save} style={{ padding: '20px 22px' }}>
              {/* Contract name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Contract Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Maintenance — John Doe" required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
              </div>

              {/* Customer */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Customer (optional)</label>
                <input value={custSearch} onChange={e => { setCustSearch(e.target.value); if (!e.target.value) setForm(f => ({ ...f, customerId: '' })); }} placeholder="Search by name or phone…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                {custResults.length > 0 && (
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, marginTop: 4 }}>
                    {custResults.map(c => (
                      <div key={c.id} onClick={() => { setForm(f => ({ ...f, customerId: c.id })); setCustSearch(`${c.firstName} ${c.lastName}`); setCustResults([]); }}
                        style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid #1e293b' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <strong>{c.firstName} {c.lastName}</strong> <span style={{ color: '#64748b' }}>· {c.phone || c.email || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Frequency + Start + Due days */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Billing Frequency</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Start / First Bill Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Invoice Due (days)</label>
                  <input type="number" min="1" value={form.dueDays} onChange={e => setForm(f => ({ ...f, dueDays: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Line items */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Line Items</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 36px', background: '#0f172a', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#64748b', gap: 8 }}>
                  <span>Description</span><span>Qty</span><span>Unit Price</span><span></span>
                </div>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 36px', padding: '6px 10px', gap: 8, borderTop: '1px solid #1e293b', alignItems: 'center' }}>
                    <input value={l.description} onChange={e => setLine(i, 'description', e.target.value)} placeholder="e.g. Monthly screen protection plan"
                      style={{ padding: '7px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                    <input type="number" min="1" value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)}
                      style={{ padding: '7px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                    <input type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} placeholder="0.00"
                      style={{ padding: '7px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => removeLine(i)} style={{ padding: 4, borderRadius: 5, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XMarkIcon style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
                <div style={{ padding: '8px 10px', borderTop: '1px solid #1e293b' }}>
                  <button type="button" onClick={addLine} style={{ fontSize: 12, color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PlusIcon style={{ width: 13, height: 13 }} /> Add line
                  </button>
                </div>
              </div>

              {/* Tax + notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Tax Rate (%)</label>
                  <input type="number" min="0" max="30" step="0.01" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contract terms, payment instructions…"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}><span>Subtotal</span><span>{fmt$(subtotal)}</span></div>
                {parseFloat(form.taxRate) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}><span>Tax ({form.taxRate}%)</span><span>{fmt$(taxAmt)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#34d399', borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 4 }}>
                  <span>Total per {form.frequency.replace('quarterly','quarter')}</span>
                  <span>{fmt$(totalCalc)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(false)} style={{ padding: '9px 18px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      {paying && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', width: '100%', maxWidth: 360, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <CheckCircleIcon style={{ width: 20, height: 20, color: '#34d399' }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Mark Invoice Paid</span>
            </div>
            <div style={{ marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Invoice <strong style={{ color: '#60a5fa' }}>{paying.invoiceNumber}</strong> — Amount: <strong style={{ color: '#34d399' }}>{fmt$(paying.total)}</strong></div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Payment Method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13 }}>
                {['cash','card','check','zelle','venmo','bank transfer','other'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => markPaid(paying)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Confirm Paid</button>
              <button onClick={() => setPaying(null)} style={{ padding: '10px 16px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
