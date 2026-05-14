import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowTrendingUpIcon, BuildingStorefrontIcon,
  CurrencyDollarIcon, ExclamationTriangleIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import toast from 'react-hot-toast';

const fmt$ = n => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtMonth = ym => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const PLAN_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6'];
const GRID  = '#1e2240';
const MUTED = '#374151';
const TEXT  = '#6b7280';

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background:'#1a1f35', border:'1px solid #2a2f50', boxShadow:'0 10px 25px rgba(0,0,0,0.5)' }}>
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span style={{ color: TEXT }}>{p.name}:</span>
          <span className="font-semibold text-white">{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
};

export default function SAReports() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState(12);

  async function load(m = range) {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/licenses/stats/report?months=${m}`);
      setData(d);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [range]);

  const s = data?.summary;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: TEXT }}>Subscription revenue and subscriber analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setRange(m)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={range === m
                ? { background:'rgba(99,102,241,0.2)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.4)' }
                : { background:'rgba(255,255,255,0.04)', color: TEXT, border:'1px solid #1e2240' }}>
              {m}M
            </button>
          ))}
          <button onClick={() => load(range)} className="p-1.5 rounded-lg transition-colors ml-1" style={{ color: TEXT, border:'1px solid #1e2240' }}>
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? <LoadingSkeleton /> : !data ? null : (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<CurrencyDollarIcon className="w-5 h-5" />} label="MRR" value={fmt$(s.mrr)} color="#10b981" sub={`${fmt$(s.arr)} ARR`} />
            <StatCard icon={<BuildingStorefrontIcon className="w-5 h-5" />} label="Active Stores" value={s.activeStores} color="#6366f1" sub={`${s.totalStores} total`} />
            <StatCard icon={<ArrowTrendingUpIcon className="w-5 h-5" />} label="Monthly Subs" value={s.monthly} color="#0ea5e9" sub={`${s.yearly} yearly`} />
            <StatCard icon={<ExclamationTriangleIcon className="w-5 h-5" />} label="Expired / Suspended" value={`${s.expired} / ${s.suspended}`} color={s.expired > 0 ? '#ef4444' : '#374151'} sub="need attention" />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subscriber Growth */}
            <div className="lg:col-span-2 rounded-2xl p-6" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid #1e2240' }}>
              <ChartTitle>New Subscribers — Last {range} Months</ChartTitle>
              {data.growth?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.growth.map(d => ({ ...d, month: fmtMonth(d.month) }))} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip suffix=" stores" />} />
                    <Area type="monotone" dataKey="newStores" name="New Stores" stroke="#6366f1" strokeWidth={2} fill="url(#growthGrad)" dot={{ fill:'#6366f1', r:3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </div>

            {/* Plan Distribution */}
            <div className="rounded-2xl p-6" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid #1e2240' }}>
              <ChartTitle>Plan Distribution</ChartTitle>
              {data.planDistribution?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {data.planDistribution.map((_, i) => (
                          <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip suffix=" stores" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {data.planDistribution.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                          <span className="capitalize" style={{ color: TEXT }}>{p.name}</span>
                        </div>
                        <span className="font-semibold text-white">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <EmptyChart />}
            </div>
          </div>

          {/* ── Revenue Chart + Status ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue by Month */}
            <div className="lg:col-span-2 rounded-2xl p-6" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid #1e2240' }}>
              <ChartTitle>Revenue by Month</ChartTitle>
              {data.revenue?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.revenue.map(d => ({ ...d, month: fmtMonth(d.month) }))} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => '$' + v} />
                    <Tooltip content={<CustomTooltip prefix="$" />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px]" style={{ color: MUTED }}>
                  <div className="text-center">
                    <div className="text-3xl mb-2">💰</div>
                    <div className="text-sm">No payment data yet</div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Breakdown */}
            <div className="rounded-2xl p-6" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid #1e2240' }}>
              <ChartTitle>Status Breakdown</ChartTitle>
              <div className="space-y-3 mt-4">
                {data.statusBreakdown?.map(item => {
                  const total = data.statusBreakdown.reduce((a, b) => a + b.value, 0) || 1;
                  const pct = Math.round((item.value / total) * 100);
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: TEXT }}>{item.name}</span>
                        <span className="font-semibold text-white">{item.value} <span style={{ color: MUTED }}>({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#1e2240' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MRR breakdown */}
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid #1e2240' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Revenue Split</div>
                {[
                  { label: 'Monthly subs', value: s.monthly, price: s.mrr - (s.yearly > 0 ? s.yearly * (s.arr / 12 / (s.monthly + s.yearly || 1)) : 0) },
                  { label: 'Yearly subs (÷12)', value: s.yearly },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-xs py-1.5" style={{ borderBottom: '1px solid #1a1f35' }}>
                    <span style={{ color: TEXT }}>{item.label}</span>
                    <span className="font-semibold" style={{ color: '#a5b4fc' }}>{item.value} stores</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold mt-2">
                  <span style={{ color: TEXT }}>Total MRR</span>
                  <span style={{ color: '#10b981' }}>{fmt$(s.mrr)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tables Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expiring Soon */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e2240' }}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid #1e2240' }}>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4" style={{ color: '#fbbf24' }} />Expiring in 30 Days
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                  {data.expiringSoon?.length || 0}
                </span>
              </div>
              {data.expiringSoon?.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: MUTED }}>No stores expiring soon 🎉</div>
              ) : (
                <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: '#1a1f35' }}>
                  {data.expiringSoon?.map(store => {
                    const days = Math.ceil((new Date(store.expiresAt) - new Date()) / 86400000);
                    return (
                      <div key={store.storeId} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{store.storeName}</div>
                          <div className="text-xs mt-0.5" style={{ color: TEXT }}>{fmtDate(store.expiresAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color: days <= 7 ? '#ef4444' : '#fbbf24' }}>{days}d left</div>
                          <div className="text-xs capitalize" style={{ color: MUTED }}>{store.stripePlanKey?.replace(/_/g,' ') || store.plan}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e2240' }}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid #1e2240' }}>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <CurrencyDollarIcon className="w-4 h-4" style={{ color: '#10b981' }} />Recent Payments
                </span>
              </div>
              {data.recentPayments?.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: MUTED }}>No payments recorded yet</div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#1a1f35' }}>
                  {data.recentPayments?.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{p.storeName}</div>
                        <div className="text-xs mt-0.5" style={{ color: TEXT }}>
                          {fmtDate(p.lastPaidAt)} · <span className="capitalize">{p.stripePlanKey?.replace(/_/g,' ') || p.plan}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: '#10b981' }}>${parseFloat(p.price).toFixed(2)}</div>
                        <div className="text-xs" style={{ color: p.stripeStatus ? '#818cf8' : p.paypalStatus ? '#fbbf24' : MUTED }}>
                          {p.stripeStatus ? 'stripe' : p.paypalStatus ? 'paypal' : 'manual'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: color + '0d', border: `1px solid ${color}25` }}>
      <div className="flex items-start justify-between mb-3">
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}

function ChartTitle({ children }) {
  return <div className="text-sm font-bold text-white mb-4">{children}</div>;
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[200px]" style={{ color: MUTED }}>
      <div className="text-center">
        <div className="text-3xl mb-2">📊</div>
        <div className="text-sm">No data yet</div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl h-28" style={{ background: '#1a1f35' }} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl h-64" style={{ background: '#1a1f35' }} />
        <div className="rounded-2xl h-64" style={{ background: '#1a1f35' }} />
      </div>
    </div>
  );
}
