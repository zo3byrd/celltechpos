import { useEffect, useState } from 'react';
import {
  BuildingStorefrontIcon, CubeIcon, TagIcon,
  ClockIcon, ArrowTrendingUpIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';

const CAT_COLORS = {
  part:      { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
  accessory: { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)', text: '#818cf8' },
  device:    { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)', text: '#a78bfa' },
  plan:      { bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)', text: '#4ade80' },
  service:   { bg: 'rgba(14,165,233,0.10)',  border: 'rgba(14,165,233,0.25)',text: '#38bdf8' },
  other:     { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)',text: '#9ca3af' },
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff/86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function activityDot(lastTxn) {
  if (!lastTxn) return '#374151';
  const days = (Date.now() - new Date(lastTxn)) / 86400000;
  if (days < 1)  return '#4ade80';
  if (days < 7)  return '#86efac';
  if (days < 30) return '#fbbf24';
  return '#f87171';
}

function CatBadge({ cat }) {
  const c = CAT_COLORS[cat] || CAT_COLORS.other;
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {cat}
    </span>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2240' }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e2240' }}>
        <Icon className="w-4 h-4" style={{ color: '#6366f1' }} />
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SAAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const thStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151',
    background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e2240' };

  const tdStyle = { padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #0d1020' };

  if (loading) return (
    <div className="p-8 space-y-6">
      {[...Array(3)].map((_,i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', height: 180 }} />
      ))}
    </div>
  );

  const { storeActivity = [], topItems = [], topCategories = [], topBrands = [], recentItems = [] } = data || {};
  const maxCat = Math.max(...topCategories.map(c => c.total), 1);
  const maxBrand = Math.max(...topBrands.map(b => b.total), 1);

  return (
    <div className="p-8 space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Store activity & product trends across all subscribers</p>
      </div>

      {/* ── Store Activity ── */}
      <Section title="Store Activity (Last 30 Days)" icon={BuildingStorefrontIcon}>
        {storeActivity.length === 0 ? (
          <div className="p-10 text-center" style={{ color: '#374151' }}>No stores found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['', 'Store', 'Location', 'Last Activity', 'Transactions', 'Repairs', 'Activations', 'Inventory', 'Customers'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storeActivity.map(s => (
                  <tr key={s.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: activityDot(s.lastTxn), boxShadow: `0 0 6px ${activityDot(s.lastTxn)}` }} />
                    </td>
                    <td style={tdStyle}>
                      <div className="font-semibold text-white">{s.name || '—'}</div>
                      <div style={{ fontSize: 11, color: '#4b5563' }}>{s.email}</div>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{[s.city, s.state].filter(Boolean).join(', ') || '—'}</td>
                    <td style={{ ...tdStyle, color: s.lastTxn ? '#9ca3af' : '#374151' }}>{timeAgo(s.lastTxn)}</td>
                    <td style={tdStyle}>
                      <span style={{ color: s.txn30d > 0 ? '#818cf8' : '#374151', fontWeight: s.txn30d > 0 ? 700 : 400 }}>{s.txn30d}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: s.repair30d > 0 ? '#fbbf24' : '#374151', fontWeight: s.repair30d > 0 ? 700 : 400 }}>{s.repair30d}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: s.act30d > 0 ? '#4ade80' : '#374151', fontWeight: s.act30d > 0 ? 700 : 400 }}>{s.act30d}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{s.inventoryCount}</td>
                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{s.customerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2 flex items-center gap-4 text-xs" style={{ borderTop: '1px solid #0d1020', color: '#374151' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} /> Active today</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} /> Active this week</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} /> Inactive 30d+</span>
            </div>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Category Breakdown ── */}
        <Section title="Inventory by Category" icon={TagIcon}>
          <div className="p-5 space-y-3">
            {topCategories.map(c => (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1">
                  <CatBadge cat={c.category} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{c.total} items · {c.storeCount} store{c.storeCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: '#1e2240', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${(c.total / maxCat) * 100}%`,
                    background: CAT_COLORS[c.category]?.text || '#818cf8',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
            {topCategories.length === 0 && <p style={{ color: '#374151', fontSize: 13 }}>No data yet.</p>}
          </div>
        </Section>

        {/* ── Top Brands ── */}
        <Section title="Top Brands" icon={SparklesIcon}>
          <div className="p-5 space-y-2.5">
            {topBrands.map((b, i) => (
              <div key={b.brand} className="flex items-center gap-3">
                <span style={{ width: 20, textAlign: 'right', fontSize: 11, color: '#374151', fontWeight: 700 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 20, borderRadius: 3, background: '#1e2240', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      width: `${(b.total / maxBrand) * 100}%`,
                      background: 'linear-gradient(90deg, rgba(99,102,241,0.4), rgba(139,92,246,0.4))',
                      transition: 'width 0.5s ease',
                    }} />
                    <span style={{ position: 'relative', padding: '0 8px', fontSize: 12, fontWeight: 600, color: '#d1d5db', lineHeight: '20px' }}>
                      {b.brand}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#6b7280', width: 60, textAlign: 'right' }}>{b.total} items</span>
              </div>
            ))}
            {topBrands.length === 0 && <p style={{ color: '#374151', fontSize: 13 }}>No brand data yet.</p>}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Top Products ── */}
        <Section title="Most Common Products Across Stores" icon={ArrowTrendingUpIcon}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['#', 'Product', 'Category', 'Stores', 'Total'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, i) => (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: '#374151', fontWeight: 700, width: 36 }}>{i + 1}</td>
                    <td style={{ ...tdStyle, color: '#e5e7eb', fontWeight: 500 }}>{item.name}</td>
                    <td style={tdStyle}><CatBadge cat={item.category} /></td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>{item.storeCount}</span>
                      <span style={{ fontSize: 11, color: '#374151' }}> store{item.storeCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{item.total}</td>
                  </tr>
                ))}
                {topItems.length === 0 && (
                  <tr><td colSpan={5} style={{ ...tdStyle, color: '#374151', textAlign: 'center', padding: 32 }}>No inventory data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Recently Added Items ── */}
        <Section title="Recently Added to Inventory" icon={ClockIcon}>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {recentItems.map((item, i) => (
              <div key={i} style={{ padding: '10px 20px', borderBottom: '1px solid #0d1020', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 1 }}>
                    {item.storeName} {item.brand ? `· ${item.brand}` : ''}
                  </div>
                </div>
                <CatBadge cat={item.category} />
                <span style={{ fontSize: 11, color: '#374151', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.createdAt)}</span>
              </div>
            ))}
            {recentItems.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#374151', fontSize: 13 }}>No recent items.</div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
