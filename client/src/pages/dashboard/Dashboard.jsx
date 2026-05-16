import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const fmt$ = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [appts, setAppts] = useState([]);
  const [repairs, setRepairs] = useState([]);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setStats(r.data)).catch(() => {});
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    api.get(`/reports/sales?startDate=${start}&endDate=${end}&groupBy=day`)
      .then(r => setSales(r.data.map(d => ({ date: d.period?.slice(5, 10), rev: parseFloat(d.revenue || 0) }))))
      .catch(() => {});
    const today = new Date().toISOString().slice(0, 10);
    api.get(`/appointments?date=${today}&limit=6`).then(r => setAppts(r.data.appointments || [])).catch(() => {});
    api.get('/repairs?status=ready&limit=8').then(r => setRepairs(r.data.tickets || [])).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">

      {/* ── Top stat bar ── */}
      <div className="border-b border-gray-200 bg-white" style={{ flexShrink: 0 }}>
        {/* Store name + action buttons row (desktop only) */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-800 mr-2">{user?.store?.name || 'CellTechPOS'}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/app/repairs/new" className="btn-primary">+ Repair</Link>
            <Link to="/app/pos" className="btn-secondary">POS</Link>
            <Link to="/app/bill-payments" className="btn-secondary">Bill Pay</Link>
          </div>
        </div>

        {/* Stats row — scrollable on mobile */}
        <div className="flex overflow-x-auto" style={{ height: 52, scrollbarWidth: 'none' }}>
          {stats ? (
            <>
              <StatBar label="Today" value={fmt$(stats.sales.today)} accent="green" href="/app/pos" />
              <StatBar label="Month" value={fmt$(stats.sales.month)} href="/app/reports" />
              <StatBar label="Open Repairs" value={stats.repairs.open} sub={`${stats.repairs.ready} ready`} accent="amber" href="/app/repairs" />
              <StatBar label="Activations" value={stats.activations.monthApproved} sub={`${stats.activations.pending} pending`} href="/app/activations" />
              <StatBar label="Low Stock" value={stats.inventory.lowStock} accent={stats.inventory.lowStock > 0 ? 'red' : 'gray'} href="/app/inventory?lowStock=true" />
              <StatBar label="Appts Today" value={appts.length} href="/app/appointments" />
            </>
          ) : (
            <div className="flex items-center px-4 text-xs text-gray-400 animate-pulse">Loading…</div>
          )}
        </div>

        {/* Mobile action buttons */}
        <div className="md:hidden flex gap-2 px-3 pb-2">
          <Link to="/app/repairs/new" className="btn-primary flex-1 text-center text-xs py-1.5">+ Repair</Link>
          <Link to="/app/pos" className="btn-secondary flex-1 text-center text-xs py-1.5">POS</Link>
          <Link to="/app/bill-payments" className="btn-secondary flex-1 text-center text-xs py-1.5">Bill Pay</Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

        {/* Left column */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {/* Revenue chart */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Revenue · Last 30 Days</span>
              <Link to="/app/reports" className="text-xs text-green-700 hover:underline">Full report →</Link>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={sales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={isDark ? '#10b981' : '#15803d'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isDark ? '#10b981' : '#15803d'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, padding: '4px 8px', background: isDark ? '#1f2937' : '#fff', color: isDark ? '#e5e7eb' : '#111827' }}
                  formatter={v => [fmt$(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="rev" stroke={isDark ? '#10b981' : '#15803d'} fill="url(#g)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ready for pickup */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-bold text-gray-700">Ready for Pickup</span>
              <Link to="/app/repairs?status=ready" className="text-xs text-green-700 hover:underline">View all →</Link>
            </div>
            {repairs.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-400">No repairs ready for pickup</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Ticket</th>
                      <th className="table-th">Customer</th>
                      <th className="table-th hidden sm:table-cell">Device</th>
                      <th className="table-th hidden sm:table-cell">Est. Cost</th>
                      <th className="table-th">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.map(r => (
                      <tr key={r.id} className="table-row">
                        <td className="table-td font-mono text-xs">
                          <Link to={`/app/repairs/${r.id}`} className="text-green-700 hover:underline">{r.ticketNumber}</Link>
                        </td>
                        <td className="table-td">{r.Customer ? `${r.Customer.firstName} ${r.Customer.lastName}` : '—'}</td>
                        <td className="table-td text-gray-500 hidden sm:table-cell">{r.deviceBrand} {r.deviceModel}</td>
                        <td className="table-td hidden sm:table-cell">{r.finalCost ? fmt$(r.finalCost) : r.estimatedCost ? fmt$(r.estimatedCost) : '—'}</td>
                        <td className="table-td">
                          <span className={r.priority === 'urgent' ? 'badge-red' : r.priority === 'high' ? 'badge-orange' : 'badge-gray'}>{r.priority}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column — stacks below on mobile */}
        <div className="lg:w-64 lg:flex-shrink-0 lg:border-l border-t lg:border-t-0 border-gray-200 overflow-y-auto bg-white">

          {/* Today's appointments */}
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-bold text-gray-700">Today's Appts.</span>
              <Link to="/app/appointments" className="text-xs text-green-700 hover:underline">All →</Link>
            </div>
            {appts.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400">No appointments today</div>
            ) : appts.map(a => (
              <div key={a.id} className="px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-800 truncate flex-1">{a.title}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{fmtTime(a.scheduledAt)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{a.customerName || a.Customer?.firstName} · {a.deviceBrand || 'Device'}</div>
                <span className={`mt-0.5 inline-block text-xs px-1.5 py-0.5 rounded font-medium ${
                  a.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  a.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{a.status}</span>
              </div>
            ))}
            <Link to="/app/appointments" className="block px-3 py-2 text-xs text-center text-green-700 hover:bg-green-50 border-t border-gray-100">
              + New appointment
            </Link>
          </div>

          {/* Quick links */}
          <div>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-bold text-gray-700">Quick Links</span>
            </div>
            {[
              { to: '/app/repairs/new',   label: 'New Repair Ticket' },
              { to: '/app/pos',           label: 'Open Point of Sale' },
              { to: '/app/bill-payments', label: 'Process Bill Payment' },
              { to: '/app/activations',   label: 'New Activation' },
              { to: '/app/layaway',       label: 'Layaway Plans' },
              { to: '/app/timeclock',     label: 'Time Clock' },
              { to: '/app/loyalty',       label: 'Loyalty Lookup' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="block px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-800 border-b border-gray-100 last:border-0 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, sub, accent, href }) {
  const accentClass = accent === 'green' ? 'text-green-700' : accent === 'amber' ? 'text-amber-600' : accent === 'red' ? 'text-red-600' : 'text-gray-800';
  const content = (
    <div className="flex items-center gap-2 px-3 h-full border-r border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer flex-shrink-0">
      <div>
        <div className="text-xs font-bold text-gray-400 leading-none mb-1 uppercase tracking-wide whitespace-nowrap">{label}</div>
        <div className={`text-base font-bold leading-none ${accentClass} whitespace-nowrap`}>{value}</div>
        {sub && <div className="text-xs font-semibold text-gray-400 leading-none mt-1 whitespace-nowrap">{sub}</div>}
      </div>
    </div>
  );
  return href ? <Link to={href} className="h-full flex flex-shrink-0">{content}</Link> : content;
}
