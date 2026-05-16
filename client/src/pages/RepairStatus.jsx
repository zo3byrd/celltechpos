import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CellTechLogo from '../components/Logo';

const STATUS_STEPS = ['received', 'diagnosing', 'waiting_parts', 'repairing', 'ready', 'picked_up'];

const STATUS_META = {
  received:       { label: 'Received',       color: '#6366f1', desc: 'We have your device and will begin diagnosing soon.' },
  diagnosing:     { label: 'Diagnosing',     color: '#f59e0b', desc: 'Our technician is inspecting your device.' },
  waiting_parts:  { label: 'Waiting Parts',  color: '#f59e0b', desc: 'We\'re waiting on parts to arrive for your repair.' },
  repairing:      { label: 'In Repair',      color: '#3b82f6', desc: 'Your device is currently being repaired.' },
  ready:          { label: 'Ready',          color: '#10b981', desc: 'Your device is ready for pickup!' },
  picked_up:      { label: 'Picked Up',      color: '#6b7280', desc: 'This repair has been completed and picked up.' },
  cancelled:      { label: 'Cancelled',      color: '#ef4444', desc: 'This repair order has been cancelled.' },
};

function fmt(val) {
  if (!val) return null;
  return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function money(val) {
  if (!val && val !== 0) return null;
  return '$' + parseFloat(val).toFixed(2);
}

export default function RepairStatus() {
  const { ticketNumber: paramTicket } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(paramTicket || '');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup(num) {
    const tn = (num || query).trim().toUpperCase();
    if (!tn) return;
    setLoading(true);
    setError('');
    setTicket(null);
    try {
      const res = await fetch(`/api/public/repair-status/${encodeURIComponent(tn)}`);
      if (res.status === 404) { setError('Ticket not found. Please check your ticket number and try again.'); return; }
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setTicket(data);
      navigate(`/status/${tn}`, { replace: true });
    } catch {
      setError('Could not look up this ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-lookup if ticket number in URL
  useState(() => { if (paramTicket && !ticket) lookup(paramTicket); }, []);

  const meta = ticket ? (STATUS_META[ticket.status] || { label: ticket.status, color: '#6b7280', desc: '' }) : null;
  const stepIndex = ticket ? STATUS_STEPS.indexOf(ticket.status) : -1;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#111827', borderBottom: '1px solid #1f2937', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <CellTechLogo height={44} />
        </a>
        <div style={{ color: '#9ca3af', fontSize: 14, marginLeft: 8 }}>Repair Status</div>
      </div>

      <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
        {/* Search */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, color: '#111827' }}>Check Repair Status</h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>Enter your ticket number from your receipt.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="e.g. TK-00123"
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, outline: 'none' }}
            />
            <button
              onClick={() => lookup()}
              disabled={loading}
              style={{ padding: '10px 22px', background: '#2dd4bf', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Looking up…' : 'Search'}
            </button>
          </div>
          {error && <p style={{ margin: '12px 0 0', color: '#ef4444', fontSize: 14 }}>{error}</p>}
        </div>

        {/* Result */}
        {ticket && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Ticket #{ticket.ticketNumber}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  {ticket.deviceBrand} {ticket.deviceModel || ticket.deviceType}
                </div>
              </div>
              <span style={{ background: meta.color + '20', color: meta.color, fontWeight: 700, fontSize: 13, padding: '6px 14px', borderRadius: 20 }}>
                {meta.label}
              </span>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151', background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>
              {meta.desc}
            </p>

            {/* Progress bar */}
            {ticket.status !== 'cancelled' && stepIndex >= 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  {STATUS_STEPS.slice(0, 5).map((s, i) => (
                    <div key={s} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', margin: '0 auto 4px',
                        background: i <= stepIndex ? meta.color : '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#fff', fontWeight: 700
                      }}>
                        {i < stepIndex ? '✓' : i === stepIndex ? '●' : ''}
                      </div>
                      <div style={{ fontSize: 9, color: i <= stepIndex ? meta.color : '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                        {STATUS_META[s]?.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {ticket.issueDescription && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Issue</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>{ticket.issueDescription}</div>
                </div>
              )}
              {fmt(ticket.createdAt) && (
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Dropped Off</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>{fmt(ticket.createdAt)}</div>
                </div>
              )}
              {fmt(ticket.dueDate) && (
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Est. Ready</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>{fmt(ticket.dueDate)}</div>
                </div>
              )}
              {money(ticket.estimatedCost) && (
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Est. Cost</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>{money(ticket.estimatedCost)}</div>
                </div>
              )}
              {money(ticket.finalCost) && (
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Final Cost</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{money(ticket.finalCost)}</div>
                </div>
              )}
            </div>

            {/* Store contact */}
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>{ticket.storeName}</div>
              <div style={{ fontSize: 13, color: '#15803d' }}>
                {ticket.storePhone && <span>📞 {ticket.storePhone}</span>}
                {ticket.storePhone && ticket.storeEmail && <span style={{ margin: '0 8px' }}>·</span>}
                {ticket.storeEmail && <span>✉️ {ticket.storeEmail}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
