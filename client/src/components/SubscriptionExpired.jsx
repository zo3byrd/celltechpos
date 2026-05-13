import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';

const MESSAGES = {
  EXPIRED:    { title: 'Subscription Expired', sub: 'Your subscription has ended. Contact support to renew.' },
  SUSPENDED:  { title: 'Account Suspended', sub: 'Your account has been suspended. Contact support.' },
  NO_LICENSE: { title: 'No Active Subscription', sub: 'Your account is not yet activated. Contact support.' },
};

export default function SubscriptionExpired({ error }) {
  const { logout } = useAuthStore();
  const { title, sub } = MESSAGES[error?.code] || MESSAGES.NO_LICENSE;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded p-10 max-w-md w-full text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldExclamationIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{sub}</p>
        {error?.expiresAt && (
          <p className="text-xs text-gray-400 mb-4">
            Expired: {new Date(error.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6 text-left">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contact Support</p>
          <p className="text-sm font-semibold text-gray-800">zo3byrd@gmail.com</p>
          <p className="text-xs text-gray-500 mt-1">CellTechPOS Licensing</p>
        </div>
        <button onClick={logout} className="btn-secondary w-full justify-center">
          Sign Out
        </button>
      </div>
    </div>
  );
}
