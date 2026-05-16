import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../../api/client';

const COLORS = ['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2'];

const fmt = n => '$' + parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = n => parseFloat(n || 0).toFixed(1) + '%';

function PLRow({ label, value, indent = false, bold = false, color, note, borderTop }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${borderTop ? 'border-t-2 border-gray-200 mt-1' : 'border-b border-gray-50'}`}>
      <div className={`text-sm ${indent ? 'pl-6 text-gray-500' : bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {label}
        {note && <span className="ml-2 text-xs text-gray-400">{note}</span>}
      </div>
      <div className={`text-sm font-mono ${bold ? 'font-bold text-base' : ''} ${color || (parseFloat(value) < 0 ? 'text-red-600' : 'text-gray-800')}`}>
        {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
      </div>
    </div>
  );
}

function PLSection({ title, children, total, totalLabel, totalColor }) {
  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 divide-y divide-gray-50">
        {children}
        <div className={`flex items-center justify-between py-3 font-bold text-sm border-t border-gray-200`}>
          <span className="text-gray-800">{totalLabel || 'Total'}</span>
          <span className={`font-mono ${totalColor || 'text-gray-900'}`}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [sales, setSales] = useState([]);
  const [repairs, setRepairs] = useState(null);
  const [activations, setActivations] = useState(null);
  const [pl, setPL] = useState(null);
  const [plLoading, setPLLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [start, setStart] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState('pl');

  function load() {
    api.get('/reports/dashboard').then(r => setDashboard(r.data));
    api.get(`/reports/sales?startDate=${start}&endDate=${end}`).then(r =>
      setSales(r.data.map(d => ({ date: d.period?.slice(0, 10), revenue: parseFloat(d.revenue || 0), count: parseInt(d.count || 0) })))
    );
    api.get(`/reports/repairs?startDate=${start}&endDate=${end}`).then(r => setRepairs(r.data));
    api.get(`/reports/activations?startDate=${start}&endDate=${end}`).then(r => setActivations(r.data));
    loadPL();
    loadStaff();
  }

  function loadPL() {
    setPLLoading(true);
    api.get(`/reports/profit-loss?startDate=${start}&endDate=${end}`)
      .then(r => setPL(r.data))
      .finally(() => setPLLoading(false));
  }

  function loadStaff() {
    setStaffLoading(true);
    api.get(`/reports/staff?startDate=${start}&endDate=${end}`)
      .then(r => setStaff(r.data))
      .finally(() => setStaffLoading(false));
  }

  useEffect(load, [start, end]);

  const tabs = [
    { key: 'pl',          label: 'Profit & Loss' },
    { key: 'sales',       label: 'Sales' },
    { key: 'repairs',     label: 'Repairs' },
    { key: 'activations', label: 'Activations' },
    { key: 'staff',       label: 'Staff' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">From</label>
          <input type="date" className="input w-36" value={start} onChange={e => setStart(e.target.value)} />
          <label className="text-gray-500">To</label>
          <input type="date" className="input w-36" value={end} onChange={e => setEnd(e.target.value)} />
          <button className="btn-secondary" onClick={load}>Refresh</button>
        </div>
      </div>

      {/* KPI Row */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Today Revenue',  value: fmt(dashboard.sales.today),           color: 'text-green-600' },
            { label: 'Month Revenue',  value: fmt(dashboard.sales.month),            color: 'text-blue-600' },
            { label: 'Open Repairs',   value: dashboard.repairs.open,               color: 'text-yellow-600' },
            { label: 'Month Acts.',    value: dashboard.activations.monthApproved,   color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── P&L Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'pl' && (
        <div className="space-y-4">
          {plLoading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
            </div>
          )}

          {!plLoading && pl && (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue',  value: fmt(pl.revenue.total),  color: 'text-blue-600'  },
                  { label: 'Gross Profit',   value: fmt(pl.grossProfit),     color: pl.grossProfit  >= 0 ? 'text-green-600' : 'text-red-600', note: pct(pl.grossMargin) + ' margin' },
                  { label: 'Total Expenses', value: fmt(pl.expenses.total + pl.refunds), color: 'text-orange-600' },
                  { label: 'Net Profit',     value: fmt(pl.netProfit),       color: pl.netProfit >= 0 ? 'text-green-700' : 'text-red-700',   note: pct(pl.netMargin) + ' margin' },
                ].map(({ label, value, color, note }) => (
                  <div key={label} className="card border-2 border-gray-100">
                    <div className={`text-xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
                    {note && <div className="text-xs text-gray-400 mt-0.5">{note}</div>}
                  </div>
                ))}
              </div>

              {/* P&L Statement */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  {/* Revenue */}
                  <PLSection title="Revenue" total={pl.revenue.total} totalLabel="Total Revenue" totalColor="text-blue-700">
                    <PLRow label="Retail Sales"       value={pl.revenue.sales}       indent />
                    <PLRow label="Repair Payments"    value={pl.revenue.repairs}     indent />
                    <PLRow label="Activation Plans"   value={pl.revenue.activations} indent />
                    <PLRow label="Deposits Collected" value={pl.revenue.deposits}    indent />
                  </PLSection>

                  {/* COGS */}
                  <PLSection title="Cost of Goods Sold" total={pl.cogs.total} totalLabel="Total COGS" totalColor="text-red-600">
                    <PLRow label="Parts & Items Sold" value={pl.cogs.salesItems}  indent />
                    <PLRow label="Repair Parts Used"  value={pl.cogs.repairParts} indent />
                  </PLSection>
                </div>

                <div className="space-y-4">
                  {/* Gross Profit */}
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-700">Gross Profit</div>
                        <div className="text-xs text-gray-400">Revenue − COGS</div>
                      </div>
                      <div className={`text-2xl font-bold font-mono ${pl.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pl.grossProfit < 0 ? `(${fmt(Math.abs(pl.grossProfit))})` : fmt(pl.grossProfit)}
                      </div>
                    </div>
                    <div className="mt-3 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${pl.grossMargin >= 30 ? 'bg-green-500' : pl.grossMargin >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.max(pl.grossMargin, 0), 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{pct(pl.grossMargin)} gross margin</div>
                  </div>

                  {/* Expenses */}
                  <PLSection title="Operating Expenses" total={pl.expenses.total} totalLabel="Total Expenses" totalColor="text-orange-600">
                    <PLRow label="Commissions Paid" value={pl.expenses.commissions} indent />
                  </PLSection>

                  {/* Refunds */}
                  {pl.refunds > 0 && (
                    <div className="card flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700">Refunds Issued</div>
                      <div className="text-sm font-mono text-red-500">({fmt(pl.refunds)})</div>
                    </div>
                  )}

                  {/* Net Profit */}
                  <div className={`card border-2 ${pl.netProfit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-bold ${pl.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>Net Profit</div>
                        <div className="text-xs text-gray-500">Gross Profit − Expenses − Refunds</div>
                      </div>
                      <div className={`text-3xl font-bold font-mono ${pl.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {pl.netProfit < 0 ? `(${fmt(Math.abs(pl.netProfit))})` : fmt(pl.netProfit)}
                      </div>
                    </div>
                    <div className="mt-3 bg-white/60 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${pl.netMargin >= 20 ? 'bg-green-500' : pl.netMargin >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.max(pl.netMargin, 0), 100)}%` }}
                      />
                    </div>
                    <div className={`text-xs mt-1 ${pl.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{pct(pl.netMargin)} net margin</div>
                  </div>
                </div>
              </div>

              {/* Waterfall bar chart */}
              <div className="card">
                <h2 className="font-semibold mb-4 text-gray-800">P&L Breakdown</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: 'Revenue',       value: parseFloat(pl.revenue.total.toFixed(2)),  fill: '#2563eb' },
                    { name: 'COGS',          value: parseFloat(pl.cogs.total.toFixed(2)),     fill: '#dc2626' },
                    { name: 'Gross Profit',  value: parseFloat(pl.grossProfit.toFixed(2)),    fill: pl.grossProfit >= 0 ? '#16a34a' : '#dc2626' },
                    { name: 'Expenses',      value: parseFloat(pl.expenses.total.toFixed(2)), fill: '#d97706' },
                    { name: 'Net Profit',    value: parseFloat(pl.netProfit.toFixed(2)),      fill: pl.netProfit >= 0 ? '#15803d' : '#b91c1c' },
                  ]} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={v => [fmt(v), '']} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {[
                        { fill: '#2563eb' }, { fill: '#dc2626' },
                        { fill: pl.grossProfit >= 0 ? '#16a34a' : '#dc2626' },
                        { fill: '#d97706' },
                        { fill: pl.netProfit >= 0 ? '#15803d' : '#b91c1c' },
                      ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Sales Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-4">Daily Revenue</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-2">Transaction Count</h2>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Repairs Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'repairs' && repairs && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold mb-4">Tickets by Status</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={repairs.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`}>
                  {repairs.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card flex flex-col justify-center">
            <h2 className="font-semibold mb-4">Repair Revenue</h2>
            <div className="text-4xl font-bold text-blue-600">{fmt(repairs.revenue)}</div>
            <p className="text-sm text-gray-500 mt-1">Repair payments received in period</p>
          </div>
        </div>
      )}

      {/* ── Staff Leaderboard Tab ───────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {staffLoading && (
            <div className="card animate-pulse h-48 bg-gray-100" />
          )}
          {!staffLoading && (
            <div className="card p-0 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Sales Leaderboard</h3>
                <span className="text-xs text-gray-400">{start} → {end}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['#','Name','Role','Sales','Sales $','Repairs','Repair $','Tips'].map(h => (
                      <th key={h} className="table-th text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staff.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No data for this period</td></tr>
                  )}
                  {staff.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-gray-50 ${i === 0 && parseFloat(s.salesTotal) > 0 ? 'bg-yellow-50' : ''}`}>
                      <td className="table-td font-bold text-gray-400">{i === 0 && parseFloat(s.salesTotal) > 0 ? '🥇' : i + 1}</td>
                      <td className="table-td font-semibold text-gray-900">{s.name}</td>
                      <td className="table-td"><span className="badge badge-gray capitalize">{s.role}</span></td>
                      <td className="table-td text-center">{s.salesCount}</td>
                      <td className="table-td font-mono text-green-700">{fmt(s.salesTotal)}</td>
                      <td className="table-td text-center">{s.repairCount}</td>
                      <td className="table-td font-mono text-blue-700">{fmt(s.repairTotal)}</td>
                      <td className="table-td font-mono text-purple-700">{parseFloat(s.tipsTotal) > 0 ? fmt(s.tipsTotal) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {staff.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                    <tr>
                      <td className="table-td" colSpan={3}>Total</td>
                      <td className="table-td text-center">{staff.reduce((s, r) => s + parseInt(r.salesCount || 0), 0)}</td>
                      <td className="table-td font-mono text-green-700">{fmt(staff.reduce((s, r) => s + parseFloat(r.salesTotal || 0), 0))}</td>
                      <td className="table-td text-center">{staff.reduce((s, r) => s + parseInt(r.repairCount || 0), 0)}</td>
                      <td className="table-td font-mono text-blue-700">{fmt(staff.reduce((s, r) => s + parseFloat(r.repairTotal || 0), 0))}</td>
                      <td className="table-td font-mono text-purple-700">{fmt(staff.reduce((s, r) => s + parseFloat(r.tipsTotal || 0), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Activations Tab ─────────────────────────────────────────────── */}
      {activeTab === 'activations' && activations && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold mb-4">Activations by Carrier</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={activations.byCarrier} dataKey="count" nameKey="carrier" cx="50%" cy="50%" outerRadius={80} label={({ carrier, count }) => `${carrier}: ${count}`}>
                  {activations.byCarrier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-3">By Sales Rep</h2>
            <div className="space-y-2">
              {activations.byRep.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span>{r['salesRep.name'] || '—'}</span>
                  <span className="font-semibold">{r.count} acts</span>
                  <span className="text-green-600">{fmt(r.commission)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
