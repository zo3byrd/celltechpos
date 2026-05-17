import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  HomeIcon, BuildingStorefrontIcon, CurrencyDollarIcon,
  ChartBarIcon, MegaphoneIcon, PencilSquareIcon,
  Cog6ToothIcon, ArrowRightOnRectangleIcon, ArrowTopRightOnSquareIcon,
  ArrowTrendingUpIcon, TagIcon, Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline';

const nav = [
  { section: 'OVERVIEW', items: [
    { to: '/superadmin',              label: 'Dashboard',       icon: HomeIcon,                  exact: true },
  ]},
  { section: 'SUBSCRIPTIONS', items: [
    { to: '/superadmin/subscribers',  label: 'Subscribers',     icon: BuildingStorefrontIcon },
    { to: '/superadmin/pricing',      label: 'Pricing',         icon: CurrencyDollarIcon },
    { to: '/superadmin/coupons',      label: 'Coupons',         icon: TagIcon },
  ]},
  { section: 'ANALYTICS', items: [
    { to: '/superadmin/analytics',    label: 'Analytics',       icon: ArrowTrendingUpIcon },
    { to: '/superadmin/reports',      label: 'Reports',         icon: ChartBarIcon },
  ]},
  { section: 'MARKETING', items: [
    { to: '/superadmin/campaigns',    label: 'Campaigns',       icon: MegaphoneIcon },
  ]},
  { section: 'PLATFORM', items: [
    { to: '/superadmin/content',      label: 'Content Editor',  icon: PencilSquareIcon },
    { to: '/superadmin/settings',     label: 'Settings',        icon: Cog6ToothIcon },
  ]},
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      {/* Branding */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2240' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>C</div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">CellTechPOS</div>
            <div className="text-xs font-semibold" style={{ color: '#6366f1' }}>Admin Portal</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1 rounded text-gray-500 hover:text-white transition-colors">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(group => (
          <div key={group.section}>
            <div className="px-2 pt-4 pb-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: '#3d4270' }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' } : {}}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: view site + user */}
      <div className="px-2 py-2 space-y-1" style={{ borderTop: '1px solid #1e2240' }}>
        <a href="https://celltechpos.com" target="_blank" rel="noreferrer"
          className="flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />View Live Site
        </a>
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-300 truncate">{user?.name}</div>
            <div className="text-xs" style={{ color: '#6366f1' }}>Superadmin</div>
          </div>
          <button onClick={handleLogout} title="Sign Out" className="text-gray-600 hover:text-red-400 transition-colors">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117' }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop: always visible | mobile: slide-in drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 flex flex-col transform transition-transform duration-200
          md:relative md:translate-x-0 md:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: '#13162a', borderRight: '1px solid #1e2240' }}
      >
        {sidebarContent}
      </aside>

      {/* Right side */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 flex-shrink-0"
          style={{ background: '#13162a', borderBottom: '1px solid #1e2240', minHeight: 52 }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>C</div>
            <span className="text-white font-bold text-sm">CellTechPOS</span>
            <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>Admin</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#0f1117' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
