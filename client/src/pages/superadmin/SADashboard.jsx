import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingStorefrontIcon, CurrencyDollarIcon, ChartBarIcon,
  ExclamationTriangleIcon, ArrowTrendingUpIcon, PlusIcon,
  ClockIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const fmt$ = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function StatCard({ label, value, sub, icon, accent }) {
  const colors = {
    indigo: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', icon: '#818cf8', val: '#a5b4fc' },
    green:  { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',   icon: '#4ade80', val: '#86efac' },
    amber:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '#fbbf24', val: '#fcd34d' },
    red:    { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  icon: '#f87171', val: '#fca5a5' },
    violet: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', icon: '#a78bfa', val: '#c4b5fd' },
  };
  const c = colors[accent] || colors.indigo;
  return (
    <div className="rounded-xl p-5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: c.icon }}>{label}</span>
        <div className="p-1.5 rounded-lg" style={{ background: c.bg }}>
          {icon && <icon.type {...icon.props} className="w-4 h-4" style={{ color: c.icon }} />}
        </div>
      </div>
      <div className="text-3xl font-bold" style={{ color: c.val }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: c.icon, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

export default function SADashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/licenses/stats/revenue'),
      api.get('/licenses'),
    ]).then(([{ data: s }, { data: lics }]) => {
      setStats(s);
      setRecent(lics.slice(0, 6));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusColor = s => ({ active:'#4ade80', expired:'#f87171', suspended:'#fbbf24', cancelled:'#6b7280', trial:'#818cf8' }[s] || '#6b7280');

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>CellTechPOS — Subscription Overview</p>
        </div>
        <button onClick={() => navigate('/superadmin/subscribers')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <PlusIcon className="w-4 h-4" />Onboard Store
        </button>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', height: 110 }} />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Stores"    value={stats.activeStores}   sub={`of ${stats.totalStores} total`}  icon={<BuildingStorefrontIcon />} accent="green" />
            <StatCard label="MRR"              value={fmt$(stats.mrr)}      sub="Monthly recurring revenue"         icon={<CurrencyDollarIcon />}     accent="indigo" />
            <StatCard label="ARR"              value={fmt$(stats.arr)}      sub="Annual recurring revenue"          icon={<ArrowTrendingUpIcon />}     accent="violet" />
            <StatCard label="Needs Attention"  value={stats.expired + stats.suspended} sub={`${stats.expired} expired · ${stats.suspended} suspended`} icon={<ExclamationTriangleIcon />} accent={stats.expired + stats.suspended > 0 ? 'red' : 'green'} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Monthly Plans"  value={stats.monthly}  sub="Active subscribers"  icon={<ClockIcon />}        accent="indigo" />
            <StatCard label="Yearly Plans"   value={stats.yearly}   sub="Active subscribers"  icon={<CheckCircleIcon />}  accent="green" />
            <StatCard label="On Trial"       value={stats.trial}    sub="14-day free trial"   icon={<ChartBarIcon />}     accent="amber" />
          </div>
        </>
      ) : null}

      {/* Recent subscribers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Recent Subscribers</h2>
          <button onClick={() => navigate('/superadmin/subscribers')}
            className="text-xs font-semibold transition-colors hover:text-white" style={{ color: '#6366f1' }}>
            View all →
          </button>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2240' }}>
          {loading ? (
            <div className="p-8 text-center animate-pulse" style={{ color: '#374151' }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div className="p-10 text-center" style={{ color: '#374151' }}>
              No subscribers yet.{' '}
              <button onClick={() => navigate('/superadmin/subscribers')} style={{ color: '#6366f1' }} className="underline">
                Onboard your first store
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e2240' }}>
                  {['Store', 'Plan', 'Status', 'Expires', 'Price'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#4b5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((lic, i) => (
                  <tr key={lic.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid #1a1f35' : 'none' }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                    onClick={() => navigate('/superadmin/subscribers')}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{lic.storeName || '—'}</div>
                      <div className="text-xs" style={{ color: '#4b5563' }}>{lic.storeEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: '#9ca3af' }}>
                      {lic.stripePlanKey?.replace(/_/g, ' ') || lic.plan}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: statusColor(lic.status) + '20', color: statusColor(lic.status) }}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>{fmtDate(lic.expiresAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: lic.price > 0 ? '#a5b4fc' : '#374151' }}>
                      {lic.price > 0 ? fmt$(lic.price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Add Subscriber',   desc: 'Onboard a new store',       color: '#6366f1', path: '/superadmin/subscribers' },
            { label: 'Manage Pricing',   desc: 'Edit plan prices',           color: '#8b5cf6', path: '/superadmin/pricing' },
            { label: 'View Subscribers', desc: 'See all active stores',      color: '#0ea5e9', path: '/superadmin/subscribers' },
            { label: 'Revenue Report',   desc: 'Coming soon',                color: '#374151', path: null, disabled: true },
          ].map(a => (
            <button key={a.label} disabled={a.disabled}
              onClick={() => a.path && navigate(a.path)}
              className="rounded-xl p-4 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{ background: a.color + '18', border: `1px solid ${a.color}40` }}>
              <div className="font-bold text-sm text-white">{a.label}</div>
              <div className="text-xs mt-0.5" style={{ color: a.color, opacity: 0.8 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
