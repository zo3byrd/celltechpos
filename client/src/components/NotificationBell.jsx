import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import api from '../api/client';

const SEVERITY_STYLE = {
  warning: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  info:    { dot: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
  success: { dot: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
  error:   { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
};

export default function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const [alerts, setAlerts]   = useState([]);
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const lastFetch = useRef(0);

  const load = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetch.current < 60000) return; // throttle to 1/min
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setAlerts(data.alerts || []);
      setCount(data.count || 0);
      lastFetch.current = now;
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  // Load on mount + every 2 minutes
  useEffect(() => {
    load(true);
    const id = setInterval(() => load(true), 120000);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      <button
        onClick={toggle}
        title="Notifications"
        className="relative text-gray-500 hover:text-gray-200 transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
      >
        {count > 0
          ? <BellAlertIcon className="w-4 h-4 text-amber-400" />
          : <BellIcon className="w-3.5 h-3.5" />
        }
        {count > 0 && (
          <span className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full flex items-center justify-center"
            style={{ background: '#ef4444', minWidth: 14, height: 14, fontSize: 9, padding: '0 3px' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 z-50 shadow-2xl rounded-xl overflow-hidden"
          style={{ width: 320, background: '#1a1f2e', border: '1px solid #2a2f4a' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #2a2f4a' }}>
            <span className="text-sm font-bold text-white">Notifications</span>
            {count > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                {count} alert{count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading && alerts.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: '#4b5563' }}>Loading…</div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center">
                <BellIcon className="w-7 h-7 mx-auto mb-2" style={{ color: '#374151' }} />
                <p className="text-sm font-medium" style={{ color: '#6b7280' }}>All clear!</p>
                <p className="text-xs mt-0.5" style={{ color: '#374151' }}>No alerts right now</p>
              </div>
            ) : (
              <div>
                {alerts.map((a, i) => {
                  const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info;
                  return (
                    <Link key={i} to={a.link} onClick={() => setOpen(false)}
                      style={{ display: 'block', textDecoration: 'none', borderBottom: '1px solid #1e2240' }}
                      className="hover:opacity-80 transition-opacity">
                      <div className="px-4 py-3" style={{ background: s.bg, borderLeft: `3px solid ${s.dot}` }}>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: s.dot }} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{a.title}</p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }}>{a.body}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="px-4 py-2.5 text-center" style={{ borderTop: '1px solid #2a2f4a' }}>
              <button onClick={() => { load(true); }}
                className="text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}>
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
