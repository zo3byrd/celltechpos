import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const STATUS_LABEL = {
  received: 'Received — we have your device',
  diagnosing: 'Diagnosing the issue',
  waiting_parts: 'Waiting for parts to arrive',
  in_repair: 'Repair in progress',
  quality_check: 'Quality check underway',
  ready: '✅ Ready for pickup!',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

const STATUS_COLOR = {
  received: '#60a5fa', diagnosing: '#c084fc', waiting_parts: '#fbbf24',
  in_repair: '#f97316', quality_check: '#a78bfa', ready: '#34d399',
  picked_up: '#64748b', cancelled: '#ef4444',
};

function fmt$(n) { return n != null ? '$' + parseFloat(n).toFixed(2) : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function CustomerPortal() {
  const [params] = useSearchParams();
  const defaultTicket = params.get('ticket') || '';
  const defaultStore = params.get('storeId') || '';

  const [storeId, setStoreId] = useState(defaultStore);
  const [ticket, setTicket] = useState(defaultTicket);
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup(e) {
    e.preventDefault();
    if (!storeId) { setError('Store ID is required'); return; }
    if (!ticket && !phone) { setError('Enter a ticket number or phone number'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const base = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
      const q = new URLSearchParams({ storeId });
      if (ticket) q.set('ticket', ticket);
      else if (phone) q.set('phone', phone);
      const r = await axios.get(`${base}/api/display/lookup?${q}`);
      if (r.data.tickets.length === 0) setError('No repairs found. Double-check your ticket number or phone.');
      else setResults(r.data.tickets);
    } catch {
      setError('Could not look up repair. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: '#e2e8f0' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>CELL</span>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-1px' }}>TECH</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8', marginLeft: 6, letterSpacing: '3px' }}>POS</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '8px 0 6px' }}>Check Repair Status</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Enter your ticket number or phone number to see your repair status</p>
        </div>

        {/* Lookup form */}
        <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: '24px 24px' }}>
          <form onSubmit={lookup}>
            {!defaultStore && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Store ID</label>
                <input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="Provided by your repair shop"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Ticket Number</label>
              <input value={ticket} onChange={e => setTicket(e.target.value.toUpperCase())} placeholder="e.g. TKT-001234" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: '#334155' }} />
              <span style={{ fontSize: 12, color: '#475569' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#334155' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone on file" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', color: '#f87171', fontSize: 13, marginBottom: 14 }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: 9, background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Looking up…' : 'Check Status'}
            </button>
          </form>
        </div>

        {/* Results */}
        {results && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>{results.length} repair{results.length !== 1 ? 's' : ''} found</h2>
            {results.map(t => {
              const sc = STATUS_COLOR[t.status] || '#94a3b8';
              return (
                <div key={t.id} style={{ background: '#1e293b', borderRadius: 12, border: `1px solid ${sc}44`, padding: '18px 20px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>{t.ticketNumber}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: sc, background: `${sc}22`, padding: '3px 10px', borderRadius: 999 }}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{t.deviceBrand} {t.deviceModel}</div>
                  {t.issueDescription && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{t.issueDescription}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {t.estimatedCost && <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Estimate</div><div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{fmt$(t.estimatedCost)}</div></div>}
                    {t.finalCost && <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Final Cost</div><div style={{ fontSize: 14, fontWeight: 600, color: '#34d399' }}>{fmt$(t.finalCost)}</div></div>}
                    {t.dueDate && <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Target Date</div><div style={{ fontSize: 13, color: '#e2e8f0' }}>{fmtDate(t.dueDate)}</div></div>}
                    <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Dropped Off</div><div style={{ fontSize: 13, color: '#e2e8f0' }}>{fmtDate(t.createdAt)}</div></div>
                  </div>
                  {t.notes && <div style={{ marginTop: 10, padding: '8px 10px', background: '#0f172a', borderRadius: 6, fontSize: 12, color: '#94a3b8' }}>{t.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
