import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

const BANNER_BG = {
  info:    '#1d4ed8',
  success: '#166534',
  warning: '#92400e',
  error:   '#7f1d1d',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.get('/announcements').then(({ data }) => {
      const now = new Date();
      const active = data.filter(a => a.active && (!a.expiresAt || new Date(a.expiresAt) > now));
      if (active.length > 0) {
        const first = active[0];
        const key = `sa_ann_dismissed_${first.id}`;
        if (sessionStorage.getItem(key)) {
          setDismissed(true);
        }
        setBanner(first);
      }
    }).catch(() => {});
  }, []);

  function dismiss() {
    if (banner) {
      sessionStorage.setItem(`sa_ann_dismissed_${banner.id}`, '1');
    }
    setDismissed(true);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f3f4f6' }}>

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
        <div className="md:hidden flex items-center gap-3 px-3 py-2.5"
          style={{ background: '#161b27', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded text-gray-400 hover:text-white transition-colors"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: '#14532d' }}>C</div>
            <span className="text-white font-bold text-sm truncate">
              {user?.store?.name || 'CellTechPOS'}
            </span>
          </div>
        </div>

        {banner && !dismissed && (
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
