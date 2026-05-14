import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PencilIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

const centsToDisplay = c => (c / 100).toFixed(2);
const dollarsToCents = d => Math.round(parseFloat(d) * 100);

const TIERS = [
  { key: 'starter', label: 'Starter', color: '#0ea5e9', desc: 'Small repair shops' },
  { key: 'pro',     label: 'Pro',     color: '#6366f1', desc: 'Growing stores' },
  { key: 'multi',   label: 'Multi',   color: '#8b5cf6', desc: 'Multi-location' },
];

export default function Pricing() {
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const inp = { background:'#1a1f35', border:'1px solid #2a2f50', color:'white', borderRadius:'0.5rem', padding:'0.5rem 0.75rem', width:'100%', outline:'none', fontSize:'0.875rem' };

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/licenses/stripe-plans');
      setPlans(data);
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function savePlan() {
    if (!editing.amount || parseFloat(editing.amount) < 1) return toast.error('Enter a valid price (min $1)');
    setSaving(true);
    try {
      await api.put(`/licenses/stripe-plans/${editing.key}`, {
        amount: dollarsToCents(editing.amount),
        label: editing.label,
      });
      toast.success('Price updated in Stripe');
      setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  // Group by tier
  const monthly = plans.filter(p => p.interval === 'month');
  const yearly  = plans.filter(p => p.interval === 'year');

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Pricing</h1>
        <p className="text-sm mt-0.5" style={{ color:'#6b7280' }}>Manage your subscription plan prices. Changes apply to new subscribers immediately.</p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color:'#fbbf24' }} />
        <p className="text-sm" style={{ color:'#fbbf24' }}>
          Editing a price creates a new Stripe price. <strong>Existing subscribers keep their current price</strong> until their next renewal cycle. New checkouts use the updated price immediately.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.03)', height:200 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Monthly plans */}
          <div>
            <h2 className="text-base font-bold text-white mb-4">Monthly Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map(tier => {
                const plan = monthly.find(p => p.key === `${tier.key}_monthly`);
                if (!plan) return null;
                return (
                  <PlanCard key={plan.key} plan={plan} tier={tier} onEdit={() => setEditing({ ...plan, amount: centsToDisplay(plan.amount) })} />
                );
              })}
            </div>
          </div>

          {/* Yearly plans */}
          <div>
            <h2 className="text-base font-bold text-white mb-4">Annual Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map(tier => {
                const plan = yearly.find(p => p.key === `${tier.key}_yearly`);
                if (!plan) return null;
                return (
                  <PlanCard key={plan.key} plan={plan} tier={tier} onEdit={() => setEditing({ ...plan, amount: centsToDisplay(plan.amount) })} />
                );
              })}
            </div>
          </div>

          {plans.length === 0 && (
            <div className="text-center py-10" style={{ color:'#374151' }}>
              Plans will appear here once Stripe products are created on server startup.<br />
              Make sure <code className="text-xs px-1 rounded" style={{ background:'#1a1f35', color:'#818cf8' }}>STRIPE_SECRET_KEY</code> is set.
            </div>
          )}
        </>
      )}

      {/* Edit Price Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth:'400px', background:'#13162a', border:'1px solid #1e2240', boxShadow:'0 25px 50px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid #1e2240' }}>
              <h2 className="font-bold text-white">Edit Price — {editing.label}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-600 hover:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#6b7280', marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>Plan Label</label>
                <input style={inp} value={editing.label} onChange={e => setEditing(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.7rem', fontWeight:700, color:'#6b7280', marginBottom:'0.3rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>New Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold" style={{ color:'#4b5563' }}>$</span>
                  <input type="number" style={{ ...inp, paddingLeft:'1.75rem' }} value={editing.amount}
                    onChange={e => setEditing(f => ({ ...f, amount: e.target.value }))} min="1" step="0.01" placeholder="49.00" />
                </div>
                <p className="text-xs mt-1" style={{ color:'#4b5563' }}>Billed {editing.interval === 'month' ? 'monthly' : 'annually'}</p>
              </div>
              {editing.stripePriceId && (
                <div className="text-xs rounded-lg px-3 py-2" style={{ background:'rgba(255,255,255,0.03)', color:'#374151' }}>
                  Current Stripe price ID: <span className="font-mono" style={{ color:'#4b5563' }}>{editing.stripePriceId}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background:'rgba(255,255,255,0.05)', color:'#9ca3af' }}>Cancel</button>
              <button onClick={savePlan} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {saving ? 'Saving…' : 'Update Price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, tier, onEdit }) {
  const monthlyEquiv = plan.interval === 'year' ? (plan.amount / 100 / 12).toFixed(2) : null;
  return (
    <div className="rounded-2xl p-5" style={{ background: tier.color + '10', border: `1px solid ${tier.color}30`, position:'relative' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: tier.color }}>{tier.label}</div>
          <div className="text-sm font-semibold" style={{ color:'#9ca3af' }}>{plan.label}</div>
        </div>
        <button onClick={onEdit}
          className="p-2 rounded-lg transition-colors"
          style={{ background: tier.color + '20', color: tier.color }}
          onMouseEnter={e => e.currentTarget.style.background = tier.color + '40'}
          onMouseLeave={e => e.currentTarget.style.background = tier.color + '20'}>
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold text-white">${centsToDisplay(plan.amount)}</span>
        <span className="text-sm" style={{ color:'#6b7280' }}>/{plan.interval === 'month' ? 'mo' : 'yr'}</span>
      </div>
      {monthlyEquiv && (
        <div className="text-xs" style={{ color: tier.color, opacity: 0.7 }}>${monthlyEquiv}/mo equivalent</div>
      )}
      {plan.stripePriceId && (
        <div className="mt-3 text-xs font-mono truncate" style={{ color:'#1e2240' }} title={plan.stripePriceId}>{plan.stripePriceId}</div>
      )}
    </div>
  );
}
