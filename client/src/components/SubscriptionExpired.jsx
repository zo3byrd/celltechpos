import { ShieldExclamationIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';

const MESSAGES = {
  EXPIRED:    { title: 'Subscription Expired',       sub: 'Your free trial or subscription has ended. Renew to keep access to your data and features.' },
  SUSPENDED:  { title: 'Account Suspended',          sub: 'Your account has been suspended. Please contact support to resolve this.' },
  NO_LICENSE: { title: 'No Active Subscription',     sub: 'Your account is not yet activated. Choose a plan below to get started.' },
};

export default function SubscriptionExpired({ error }) {
  const { logout } = useAuthStore();
  const { title, sub } = MESSAGES[error?.code] || MESSAGES.NO_LICENSE;
  const isSuspended = error?.code === 'SUSPENDED';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldExclamationIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{sub}</p>

        {error?.expiresAt && (
          <p className="text-xs text-red-400 mb-6 font-medium">
            Expired {new Date(error.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}

        {!isSuspended && (
          <div className="space-y-3 mb-6">
            <a href="/app/billing"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#059669,#2dd4bf)' }}>
              Renew Now — View Plans
              <ArrowRightIcon className="w-4 h-4" />
            </a>
            <a href="/pricing" target="_blank" rel="noreferrer"
              className="block w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              See Pricing & Features
            </a>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5 text-left">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Need help?</p>
          <a href="mailto:support@celltechpos.com" className="text-sm font-semibold text-teal-600 hover:underline">
            support@celltechpos.com
          </a>
          <p className="text-xs text-gray-400 mt-0.5">We typically reply within a few hours.</p>
        </div>

        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
