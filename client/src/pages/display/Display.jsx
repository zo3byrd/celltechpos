import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const STATUS_CONFIG = {
  received:      { label: 'Received',      color: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  order: 1 },
  diagnosing:    { label: 'Diagnosing',    color: '#c084fc', bg: 'rgba(168,85,247,0.15)',  order: 2 },
  waiting_parts: { label: 'Waiting Parts', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  order: 3 },
  in_repair:     { label: 'In Repair',     color: '#f97316', bg: 'rgba(249,115,22,0.15)',  order: 4 },
  quality_check: { label: 'QC Check',      color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', order: 5 },
  ready:         { label: '✅ Ready!',      color: '#34d399', bg: 'rgba(16,185,129,0.2)',   order: 6 },
};

const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', normal: '#60a5fa', low: '#94a3b8' };

function timeSince(d) {
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function Display() {
  const [params] = useSearchParams();
  const storeId = params.get('storeId');
  const [tickets, setTickets] = useState([]);
  const [ts, setTs] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef(null);

  async function load() {
    if (!storeId) return;
    try {
      const base = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
      const r = await axios.get(`${base}/api/display?storeId=${storeId}`);
      setTickets(r.data.tickets || []);
      setTs(new Date(r.data.ts));
      setError('');
    } catch (e) {
      setError('Cannot load tickets. Check your storeId.');
    }
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30000);
    const clock = setInterval(() => setNow(Date.now()), 60000);
    return () => { clearInterval(intervalRef.current); clearInterval(clock); };
  }, [storeId]);

  if (!storeId) return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📺</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Shop Display</h1>
        <p style={{ color: '#64748b', fontSize: 16 }}>Add <code style={{ background: '#1e293b', padding: '2px 8px', borderRadius: 4, color: '#60a5fa' }}>?storeId=YOUR_STORE_ID</code> to the URL</p>
        <p style={{ color: '#334155', fontSize: 13, marginTop: 8 }}>Find your store ID in Admin → Store Settings</p>
      </div>
    </div>
  );

  const grouped = {};
  Object.keys(STATUS_CONFIG).forEach(k => { grouped[k] = []; });
  tickets.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); });

  const activeStatuses = Object.keys(STATUS_CONFIG).filter(k => grouped[k].length > 0 || k === 'ready');

  return (
    <div style={{ minHeight: '100vh', background: '#020617', fontFamily: 'system-ui', padding: '20px 24px', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>CELL</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#2dd4bf' }}>TECH</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', marginLeft: 4, letterSpacing: '3px' }}>POS</span>
          <span style={{ marginLeft: 16, fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>· Repair Status Board</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Updated {ts ? timeSince(ts) + ' ago' : '...'} · Auto-refreshes every 30s</div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', marginBottom: 20 }}>{error}</div>
      )}

      {tickets.length === 0 && !error ? (
        <div style={{ textAlign: 'center', paddingTop: 80, color: '#334155' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#475569' }}>All caught up!</div>
          <div style={{ fontSize: 16, color: '#334155', marginTop: 8 }}>No active repairs right now.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const cols = grouped[status] || [];
            if (cols.length === 0 && status !== 'ready') return null;
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                  <span style={{ fontSize: 12, color: '#475569', marginLeft: 'auto' }}>{cols.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cols.length === 0 ? (
                    <div style={{ padding: '16px', borderRadius: 8, background: '#0f172a', border: '1px dashed #1e293b', textAlign: 'center', color: '#1e293b', fontSize: 13 }}>Empty</div>
                  ) : cols.map(t => (
                    <div key={t.id} style={{ padding: '12px 14px', borderRadius: 10, background: '#0f172a', border: `1px solid ${cfg.color}33`, position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>{t.ticketNumber}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[t.priority] || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.priority}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>
                        {t.deviceBrand} {t.deviceModel}
                      </div>
                      {t.Customer && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>{t.Customer.firstName} {t.Customer.lastName[0]}.</div>
                      )}
                      <div style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>In {timeSince(t.createdAt)}</div>
                      {status === 'ready' && (
                        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 20 }}>🔔</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
