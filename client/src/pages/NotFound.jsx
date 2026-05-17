import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function NotFound() {
  const { token, user } = useAuthStore();
  const dashLink = user?.role === 'superadmin' ? '/superadmin' : '/app';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f172a' }}>
      <div className="text-center max-w-md">
        <p className="text-8xl font-black mb-4" style={{ color: '#2dd4bf', letterSpacing: '-4px' }}>404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-400 text-sm mb-10 leading-relaxed">
          The link you followed doesn't exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {token ? (
            <Link to={dashLink}
              className="px-6 py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#059669,#2dd4bf)' }}>
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login"
              className="px-6 py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#059669,#2dd4bf)' }}>
              Sign In
            </Link>
          )}
          <Link to="/"
            className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold text-sm hover:border-gray-500 transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
