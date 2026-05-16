import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../api/client';

const BANNER_BG = {
  info:    '#1d4ed8',
  success: '#166534',
  warning: '#92400e',
  error:   '#7f1d1d',
};

function daysLeft(isoStr) {
  if (!isoStr) return null;
  return Math.ceil((new Date(isoStr) - new Date()) / 86400000);
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [license, setLicense] = useState(null);
  const [verifyDismissed, setVerifyDismissed] = useState(() => !!sessionStorage.getItem('verify_banner_dismissed'));

  useEffect(() => {
    api.get('/announcements').then(({ data }) => {
      const now = new Date();
      const active = data.filter(a => a.active && (!a.expiresAt || new Date(a.expiresAt) > now));
      if (active.length > 0) {
        const first = active[0];
        const key = `sa_ann_dismissed_${first.id}`;
        if (sessionStorage.getItem(key)) setDismissed(true);
        setBanner(first);
      }
    }).catch(() => {});

    if (user?.role !== 'superadmin') {
      api.get('/licenses/my').then(r => setLicense(r.data)).catch(() => {});
    }
  }, [user?.role]);

  function dismiss() {
    if (banner) sessionStorage.setItem(`sa_ann_dismissed_${banner.id}`, '1');
    setDismissed(true);
  }

  function dismissVerify() {
    sessionStorage.setItem('verify_banner_dismissed', '1');
    setVerifyDismissed(true);
  }

  const trialDays = license?.plan === 'trial' ? daysLeft(license?.expiresAt) : null;
  const showTrialBanner = trialDays !== null && trialDays <= 7 && trialDays > 0;
  const showExpiredBanner = license?.status === 'expired' || (trialDays !== null && trialDays <= 0);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: isDark ? '#111827' : '#f3f4f6' }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-3 py-2"
          style={{ background: '#161b27', borderBottom: '1px solid #1f2937', flexShrink: 0, minHeight: 52 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>CELL</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-0.5px', lineHeight: 1 }}>TECH</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', marginLeft: 4, letterSpacing: '2px', lineHeight: 1 }}>POS</span>
          </a>
          <div className="flex items-center justify-center w-10 flex-shrink-0">
            <NotificationBell />
          </div>
        </div>

        {/* Trial expiry warning */}
        {showTrialBanner && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium" style={{ background: '#92400e', color: 'white', flexShrink: 0 }}>
            <span>⏰ Your free trial expires in <strong>{trialDays} day{trialDays !== 1 ? 's' : ''}</strong>.</span>
            <Link to="/app/billing" className="ml-auto underline font-bold text-amber-200 hover:text-white flex-shrink-0">Upgrade now →</Link>
          </div>
        )}

        {/* Trial expired */}
        {showExpiredBanner && (
          <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium" style={{ background: '#7f1d1d', color: 'white', flexShrink: 0 }}>
            <span>🔒 Your trial has ended.</span>
            <Link to="/app/billing" className="ml-2 underline font-bold text-red-200 hover:text-white flex-shrink-0">Choose a plan →</Link>
          </div>
        )}

        {/* Announcement banner */}
        {banner && !dismissed && !showExpiredBanner && (
          <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
            style={{ background: BANNER_BG[banner.type] || BANNER_BG.info, color: 'white', flexShrink: 0 }}>
            <span className="font-bold">{banner.title}:</span>
            <span className="flex-1 truncate">{banner.body}</span>
            {banner.dismissible && (
              <button onClick={dismiss} className="flex-shrink-0 hover:opacity-70" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            )}
          </div>
        )}
        <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
