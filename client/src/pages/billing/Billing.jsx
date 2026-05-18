import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const PLAN_META = {
  starter: {
    name: 'Starter',
    color: '#6366f1',
    description: 'Everything you need to run your store',
    features: ['Point of Sale', 'Repairs & Estimates', 'Inventory Management', 'Customer Database', 'Reports & Analytics'],
  },
  pro: {
    name: 'Pro',
    color: '#2dd4bf',
    popular: true,
    description: 'Grow your business with advanced tools',
    features: ['Everything in Starter', 'Appointments', 'Activations', 'Loyalty Program', 'Marketing & SMS', 'Commissions', 'Buyback'],
  },
  multi: {
    name: 'Multi-Location',
    color: '#f59e0b',
    description: 'Full control across your entire operation',
    features: ['Everything in Pro', 'Bill Payments', 'Layaway', 'Time Clock', 'Purchase Orders', 'Inventory Counts'],
  },
};

function planBase(key) {
  if (key.startsWith('starter')) return 'starter';
  if (key.startsWith('pro')) return 'pro';
  if (key.startsWith('multi')) return 'multi';
  return key;
}

function fmt(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function daysLeft(isoStr) {
  if (!isoStr) return null;
  return Math.ceil((new Date(isoStr) - new Date()) / 86400000);
}

export default function Billing() {
  const { user } = useAuthStore();
  const [license, setLicense] = useState(null);
  const [plans, setPlans] = useState([]);
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(null);
  const [cryptoLoading, setCryptoLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cryptoSuccess, setCryptoSuccess] = useState(false);

  useEffect(() => {
    api.get('/licenses/my').then(r => setLicense(r.data)).catch(() => {});
    api.get('/licenses/stripe-plans').then(r => setPlans(r.data)).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setSuccess(true);
      window.history.replaceState({}, '', '/app/billing');
      // Webhook may not have fired yet — refetch after 3s to pick up updated plan
      setTimeout(() => {
        api.get('/licenses/my').then(r => setLicense(r.data)).catch(() => {});
      }, 3000);
    }
    if (params.get('crypto') === 'success') {
      setCryptoSuccess(true);
      window.history.replaceState({}, '', '/app/billing');
    }
  }, []);

  // Build plan cards from API data
  const monthlyPlans = plans.filter(p => p.interval === 'month');
  const yearlyPlans  = plans.filter(p => p.interval === 'year');

  const activePlans = (annual ? yearlyPlans : monthlyPlans).map(p => {
    const base = planBase(p.key);
    const meta = PLAN_META[base] || {};
    const monthlyEquiv = annual ? plans.find(m => m.interval === 'month' && planBase(m.key) === base) : null;
    return { ...p, ...meta, base, monthlyEquiv };
  }).sort((a, b) => a.amount - b.amount);

  async function subscribe(planKey) {
    setLoading(planKey);
    setError('');
    try {
      const { data } = await api.post('/licenses/self-checkout', { planKey });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start checkout. Try again.');
    } finally {
      setLoading(null);
    }
  }

  async function payCrypto(planKey) {
    setCryptoLoading(planKey);
    setError('');
    try {
      const { data } = await api.post('/licenses/crypto-checkout', { planKey });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start crypto checkout. Try again.');
    } finally {
      setCryptoLoading(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { data } = await api.get('/licenses/portal');
      if (data.url) window.location.href = data.url;
    } catch {
      setError('Could not open billing portal. Try again.');
    } finally {
      setPortalLoading(false);
    }
  }

  const days = daysLeft(license?.expiresAt);
  const isExpired = license?.status === 'expired' || (days !== null && days <= 0);
  // Treat as non-trial if plan was updated by webhook OR if stripeSubscriptionId exists (paid but webhook slightly delayed)
  const isTrial = license?.plan === 'trial' && !license?.stripeSubscriptionId;
  const isActive = license?.status === 'active' && !isTrial;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Plan</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.store?.name}</p>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-green-800">Subscription activated!</p>
            <p className="text-sm text-green-700 mt-0.5">Welcome aboard. Your plan is now active.</p>
          </div>
        </div>
      )}

      {cryptoSuccess && (
        <div className="mb-6 p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-center gap-3">
          <span className="text-2xl">₿</span>
          <div>
            <p className="font-semibold text-orange-800">Crypto payment received!</p>
            <p className="text-sm text-orange-700 mt-0.5">Your payment is being confirmed on-chain. Your plan will activate within a few minutes.</p>
          </div>
        </div>
      )}

      {/* Current status card */}
      {license && (
        <div className={`rounded-xl border p-5 mb-8 ${isExpired ? 'border-red-200 bg-red-50' : isTrial ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold capitalize ${isExpired ? 'text-red-700' : isTrial ? 'text-amber-700' : 'text-green-800'}`}>
                  {isTrial ? 'Free Trial' : license.plan?.replace('_', ' ')}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : isTrial ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {isExpired ? 'EXPIRED' : license.status?.toUpperCase()}
                </span>
              </div>
              {days !== null && !isActive && (
                <p className={`text-sm mt-1 ${isExpired ? 'text-red-600' : 'text-amber-700'}`}>
                  {isExpired ? 'Your trial has ended. Subscribe to keep access.' : `${days} day${days !== 1 ? 's' : ''} remaining in your free trial`}
                </p>
              )}
              {isActive && license.expiresAt && (
                <p className="text-sm text-green-700 mt-1">Next renewal: {new Date(license.expiresAt).toLocaleDateString()}</p>
              )}
            </div>
            {isActive && license.stripeCustomerId && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="text-sm font-semibold text-green-700 hover:underline disabled:opacity-50"
              >
                {portalLoading ? 'Opening…' : 'Manage billing →'}
              </button>
            )}
          </div>
        </div>
      )}

      {isActive && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-lg font-semibold text-gray-700">You're all set!</p>
          <p className="text-sm mt-2">Your subscription is active. Use the billing portal above to change plans or update payment info.</p>
        </div>
      )}

      {!isActive && (
        <>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`text-sm font-semibold ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(a => !a)}
              className={`relative w-11 h-6 rounded-full transition-colors ${annual ? 'bg-teal-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-5' : ''}`} />
            </button>
            <span className={`text-sm font-semibold ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
              Annual <span className="text-xs text-teal-600 font-bold">Save 17%</span>
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg text-center">{error}</div>
          )}

          {activePlans.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Loading plans…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activePlans.map(plan => (
                <div key={plan.key}
                  className={`relative rounded-xl border-2 p-6 flex flex-col ${plan.popular ? 'shadow-lg' : ''}`}
                  style={{ borderColor: plan.popular ? plan.color : '#e5e7eb', background: plan.popular ? 'rgba(45,212,191,0.03)' : '#fff' }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-gray-900">{plan.name || plan.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-3">{plan.description}</p>

                  <div className="mb-1">
                    <span className="text-3xl font-black" style={{ color: plan.color }}>
                      {annual
                        ? fmt(Math.round(plan.amount / 12))
                        : fmt(plan.amount)}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-gray-400 mb-3">
                      Billed as {fmt(plan.amount)}/year
                      {plan.monthlyEquiv && (
                        <span className="ml-1 text-teal-600 font-semibold">
                          (save {fmt(plan.monthlyEquiv.amount * 12 - plan.amount)})
                        </span>
                      )}
                    </p>
                  )}

                  <ul className="mt-2 mb-6 space-y-2 flex-1">
                    {(plan.features || []).map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <span style={{ color: plan.color }} className="font-bold flex-shrink-0 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => subscribe(plan.key)}
                    disabled={!!loading || !!cryptoLoading}
                    className="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
                    style={{
                      background: plan.popular ? plan.color : 'transparent',
                      color: plan.popular ? '#fff' : plan.color,
                      border: `2px solid ${plan.color}`,
                      opacity: (loading || cryptoLoading) ? 0.7 : 1,
                      cursor: (loading || cryptoLoading) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading === plan.key ? 'Redirecting…' : `Choose ${plan.name || plan.label}`}
                  </button>

                  <button
                    onClick={() => payCrypto(plan.key)}
                    disabled={!!loading || !!cryptoLoading}
                    className="w-full mt-2 py-2 rounded-lg font-semibold text-xs text-gray-500 border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cryptoLoading === plan.key ? 'Redirecting…' : '₿ Pay with Crypto'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Secure checkout via Stripe or Coinbase Commerce · Cancel anytime · No hidden fees
          </p>
        </>
      )}
    </div>
  );
}
