import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon, PlusIcon, XMarkIcon, TrashIcon,
  PaperAirplaneIcon, CheckCircleIcon, ClockIcon,
  MagnifyingGlassIcon, LinkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const STATUSES = ['draft','sent','viewed','approved','declined','expired'];
const STATUS_COLOR = {
  draft:    { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  sent:     { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  viewed:   { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  approved: { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  declined: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  expired:  { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

function fmt$(n) { return '$' + parseFloat(n || 0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

const emptyLine = { description: '', qty: 1, unitPrice: '' };

export default function Estimates() {
  const [estimates, setEstimates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // form state
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [form, setForm] = useState({ customerId: '', notes: '', taxRate: '0', validDays: '30' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState('');
  const [page, setPage] = useState(0);
  const PER = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PER, offset: page * PER });
      if (filterStatus) params.set('status', filterStatus);
      const r = await api.get(`/estimates?${params}`);
      setEstimates(r.data.estimates || []);
      setTotal(r.data.total || 0);
    } catch { toast.error('Failed to load estimates'); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

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
    setSelected(null);
    setForm({ customerId: '', notes: '', taxRate: '0', validDays: '30' });
    setLines([{ ...emptyLine }]);
    setCustSearch('');
    setCustResults([]);
    setLink('');
    setModal(true);
  }

  function setLine(i, k, v) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  }
  function addLine() { setLines(ls => [...ls, { ...emptyLine }]); }
  function removeLine(i) { setLines(ls => ls.filter((_, idx) => idx !== i)); }

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.qty || 1) * parseFloat(l.unitPrice || 0)), 0);
  const taxAmt = subtotal * (parseFloat(form.taxRate || 0) / 100);
  const total_calc = subtotal + taxAmt;

  async function save(e) {
    e.preventDefault();
    if (!lines.some(l => l.description && l.unitPrice)) {
      toast.error('Add at least one line item'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        taxRate: parseFloat(form.taxRate || 0) / 100,
        lineItems: lines.filter(l => l.description),
        validDays: parseInt(form.validDays || 30),
      };
      await api.post('/estimates', payload);
      toast.success('Estimate created');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  async function sendEstimate(id) {
    setSending(true);
    try {
      const r = await api.post(`/estimates/${id}/send`);
      setLink(r.data.link);
      toast.success('Estimate marked as sent');
      load();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  }

  async function deleteEst(id) {
    if (!confirm('Delete this estimate?')) return;
    await api.delete(`/estimates/${id}`).catch(() => null);
    toast.success('Deleted');
    load();
  }

  const displayed = estimates.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.estimateNumber?.toLowerCase().includes(s) ||
      e.Customer?.firstName?.toLowerCase().includes(s) ||
      e.Customer?.lastName?.toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%', background: '#0f172a', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DocumentTextIcon style={{ width: 20, height: 20, color: '#60a5fa' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Estimates</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Create quotes and get customer approvals</p>
          </div>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <PlusIcon style={{ width: 16, height: 16 }} /> New Estimate
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <MagnifyingGlassIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search estimate #, customer…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
          style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13 }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {link && (
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LinkIcon style={{ width: 16, height: 16, color: '#60a5fa', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#93c5fd' }}>Approval link: </span>
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#60a5fa', wordBreak: 'break-all' }}>{link}</a>
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied!'); }} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, background: '#1e3a5f', color: '#60a5fa', border: 'none', fontSize: 12, cursor: 'pointer' }}>Copy</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Estimate #', 'Customer', 'Total', 'Status', 'Valid Until', 'Created', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center' }}>
                <DocumentTextIcon style={{ width: 36, height: 36, color: '#334155', margin: '0 auto 12px', display: 'block' }} />
                <div style={{ color: '#475569', fontSize: 14 }}>No estimates yet.</div>
              </td></tr>
            ) : displayed.map((e, i) => {
              const sc = STATUS_COLOR[e.status] || STATUS_COLOR.draft;
              return (
                <tr key={e.id} style={{ borderTop: '1px solid #0f172a', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>{e.estimateNumber}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#e2e8f0' }}>{e.Customer ? `${e.Customer.firstName} ${e.Customer.lastName}` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#34d399' }}>{fmt$(e.total)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{e.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{fmtDate(e.validUntil)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{fmtDate(e.createdAt)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['draft','sent'].includes(e.status) && (
                        <button onClick={() => sendEstimate(e.id)} disabled={sending} title="Send to customer"
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <PaperAirplaneIcon style={{ width: 12, height: 12 }} /> Send
                        </button>
                      )}
                      <button onClick={() => deleteEst(e.id)} title="Delete"
                        style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, cursor: 'pointer' }}>
                        <TrashIcon style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total > PER && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #0f172a' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{total} total</span>
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
          <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #334155' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>New Estimate</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <form onSubmit={save} style={{ padding: '20px 22px' }}>
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
                        <strong>{c.firstName} {c.lastName}</strong> <span style={{ color: '#64748b' }}>· {c.phone || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Line items */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Line Items</div>
              <div style={{ border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 36px', background: '#0f172a', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#64748b', gap: 8 }}>
                  <span>Description</span><span>Qty</span><span>Unit Price</span><span></span>
                </div>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 36px', padding: '6px 10px', gap: 8, borderTop: '1px solid #1e293b', alignItems: 'center' }}>
                    <input value={l.description} onChange={e => setLine(i, 'description', e.target.value)} placeholder="Service or part description…"
                      style={{ padding: '7px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" min="1" value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)}
                      style={{ padding: '7px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} placeholder="0.00"
                      style={{ padding: '7px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => removeLine(i)} style={{ padding: 4, borderRadius: 5, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XMarkIcon style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
                <div style={{ padding: '8px 10px', borderTop: '1px solid #1e293b' }}>
                  <button type="button" onClick={addLine} style={{ fontSize: 12, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PlusIcon style={{ width: 13, height: 13 }} /> Add line
                  </button>
                </div>
              </div>

              {/* Totals + settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Tax Rate (%)</label>
                  <input type="number" min="0" max="30" step="0.01" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Valid for (days)</label>
                  <input type="number" min="1" value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Terms, warranty, additional info…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              {/* Summary */}
              <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}><span>Subtotal</span><span>{fmt$(subtotal)}</span></div>
                {parseFloat(form.taxRate) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}><span>Tax ({form.taxRate}%)</span><span>{fmt$(taxAmt)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#34d399', borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 4 }}><span>Total</span><span>{fmt$(total_calc)}</span></div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModal(false)} style={{ padding: '9px 18px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Create Estimate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
