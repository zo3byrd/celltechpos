import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import CellTechLogo from './Logo';
import {
  HomeIcon, WrenchScrewdriverIcon, ShoppingCartIcon,
  CubeIcon, UsersIcon, SignalIcon, CurrencyDollarIcon,
  ChartBarIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon,
  CalendarDaysIcon, ClockIcon, TruckIcon, StarIcon,
  MegaphoneIcon, BanknotesIcon, ArchiveBoxIcon,
  ShieldCheckIcon, KeyIcon, ChatBubbleLeftRightIcon,
  XMarkIcon, SunIcon, MoonIcon, ArrowUturnLeftIcon,
  DocumentTextIcon, ComputerDesktopIcon, ArrowPathIcon,
  CreditCardIcon, TicketIcon,
} from '@heroicons/react/24/outline';

// plan: 'trial' | 'starter' | 'pro' | 'multi'
// tier 0=starter, 1=pro, 2=multi, 99=trial (full access)
const PLAN_LEVEL = { starter: 0, pro: 1, multi: 2, trial: 99 };
function allowed(minPlan, plan) {
  return (PLAN_LEVEL[plan] ?? 99) >= (PLAN_LEVEL[minPlan] ?? 0);
}

const mainNav = [
  { to: '/app',           label: 'Dashboard',     icon: HomeIcon,             exact: true, minPlan: 'starter' },
  { to: '/app/pos',       label: 'Point of Sale', icon: ShoppingCartIcon,                  minPlan: 'starter' },
  { to: '/app/repairs',   label: 'Repairs',       icon: WrenchScrewdriverIcon,             minPlan: 'starter' },
  { to: '/app/estimates', label: 'Estimates',     icon: DocumentTextIcon,                  minPlan: 'starter' },
  { to: '/app/customers', label: 'Customers',     icon: UsersIcon,                         minPlan: 'starter' },
];
const opsNav = [
  { to: '/app/inventory',     label: 'Inventory',       icon: CubeIcon,            minPlan: 'starter' },
  { to: '/app/recurring',     label: 'Recurring',       icon: ArrowPathIcon,       minPlan: 'pro' },
  { to: '/app/appointments',  label: 'Appointments',    icon: CalendarDaysIcon,    minPlan: 'pro' },
  { to: '/app/activations',   label: 'Activations',     icon: SignalIcon,          minPlan: 'pro' },
  { to: '/app/buyback',       label: 'Buyback',         icon: ArrowUturnLeftIcon,  minPlan: 'pro' },
  { to: '/app/purchasing',    label: 'Purchase Orders', icon: TruckIcon,           minPlan: 'multi' },
  { to: '/app/bill-payments', label: 'Bill Payments',   icon: BanknotesIcon,       minPlan: 'multi' },
  { to: '/app/layaway',       label: 'Layaway',         icon: ArchiveBoxIcon,      minPlan: 'multi' },
];
const staffNav = [
  { to: '/app/commissions', label: 'Commissions', icon: CurrencyDollarIcon, minPlan: 'pro' },
  { to: '/app/timeclock',   label: 'Time Clock',  icon: ClockIcon,          minPlan: 'multi' },
];
const growthNav = [
  { to: '/app/loyalty',        label: 'Loyalty',       icon: StarIcon,                minPlan: 'pro' },
  { to: '/app/subscriptions',  label: 'Subscriptions', icon: TicketIcon,              minPlan: 'pro' },
  { to: '/app/marketing',      label: 'Marketing',     icon: MegaphoneIcon,           minPlan: 'pro' },
  { to: '/app/messages',       label: 'Messages',      icon: ChatBubbleLeftRightIcon, minPlan: 'pro' },
];
const adminNav = [
  { to: '/app/reports',    label: 'Reports',      icon: ChartBarIcon,        minPlan: 'starter' },
  { to: '/app/inv-counts', label: 'Inv. Count',   icon: ShieldCheckIcon,     minPlan: 'multi' },
  { to: '/app/admin',      label: 'Admin',        icon: Cog6ToothIcon,       minPlan: 'starter' },
  { to: '/app/billing',    label: 'Billing',      icon: CreditCardIcon,      minPlan: 'starter' },
  { to: '/display',        label: 'Shop Display', icon: ComputerDesktopIcon, minPlan: 'starter' },
];
const superNav = [
  { to: '/app/license-manager', label: 'License Manager', icon: KeyIcon },
];

function NavItem({ to, label, icon: Icon, exact, onClick, isDark }) {
  return (
    <NavLink to={to} end={exact} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
          isActive
            ? isDark
              ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500'
              : 'bg-green-900 text-green-200 border-l-2 border-green-400'
            : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-100 border-l-2 border-transparent'
        }`
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, plan } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const isSuperadmin = user?.role === 'superadmin';
  const tier = isSuperadmin ? 'trial' : (plan || 'trial');
  const can = (minPlan) => allowed(minPlan, tier);

  return (
    <aside
      style={{ background: isDark ? '#111827' : '#161b27', borderRight: `1px solid ${isDark ? '#1f2937' : '#1f2937'}`, zIndex: 50 }}
      className={[
        'w-56 flex-shrink-0 flex flex-col h-full',
        // Mobile: fixed overlay, slide in/out
        'fixed inset-y-0 left-0 transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: part of flex layout, always visible
        'md:relative md:translate-x-0',
      ].join(' ')}
    >
      {/* Logo + mobile close */}
      <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1f2937' }}>
        <div className="flex flex-col min-w-0">
          <a href="/" style={{ display: 'inline-flex', textDecoration: 'none' }} title="Go to home">
            <CellTechLogo height={56} />
          </a>
          <div className="text-gray-500 text-xs truncate mt-0.5 pl-0.5">{user?.store?.name || '...'}</div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={onClose} className="md:hidden p-1 text-gray-500 hover:text-gray-300">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {mainNav.filter(i => can(i.minPlan)).map(i => <NavItem key={i.to} {...i} onClick={onClose} isDark={isDark} />)}

        {opsNav.some(i => can(i.minPlan)) && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Ops</div>
            {opsNav.filter(i => can(i.minPlan)).map(i => <NavItem key={i.to} {...i} onClick={onClose} isDark={isDark} />)}
          </>
        )}

        {staffNav.some(i => can(i.minPlan)) && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff</div>
            {staffNav.filter(i => can(i.minPlan)).map(i => <NavItem key={i.to} {...i} onClick={onClose} isDark={isDark} />)}
          </>
        )}

        {growthNav.some(i => can(i.minPlan)) && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Growth</div>
            {growthNav.filter(i => can(i.minPlan)).map(i => <NavItem key={i.to} {...i} onClick={onClose} isDark={isDark} />)}
          </>
        )}

        {isAdmin && adminNav.some(i => can(i.minPlan)) && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</div>
            {adminNav.filter(i => can(i.minPlan)).map(i => <NavItem key={i.to} {...i} onClick={onClose} isDark={isDark} />)}
          </>
        )}

        {isSuperadmin && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#4ade80' }}>Owner</div>
            {superNav.map(i => <NavItem key={i.to} {...i} onClick={onClose} isDark={isDark} />)}
          </>
        )}

        {/* Upgrade hint */}
        {tier !== 'multi' && (
          <div className="pt-4 pb-1 px-1">
            <div className="rounded-lg px-2 py-2 text-xs" style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.18)' }}>
              <p className="font-semibold mb-0.5" style={{ color: '#2dd4bf' }}>
                {tier === 'trial' ? 'Start your subscription' : tier === 'starter' ? 'Upgrade to Pro' : 'Upgrade to Multi'}
              </p>
              <p className="text-gray-500" style={{ fontSize: 10 }}>
                {tier === 'trial' ? 'Keep access after your trial ends' : tier === 'starter' ? 'Unlock Activations, Loyalty & more' : 'Unlock Time Clock, Layaway & more'}
              </p>
              <a href="/app/billing" className="block mt-1.5 font-bold" style={{ fontSize: 10, color: '#2dd4bf' }}>View plans →</a>
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="px-2 py-2" style={{ borderTop: '1px solid #1f2937' }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: isDark ? '#059669' : '#14532d' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-300 text-xs truncate font-medium">{user?.name}</div>
            <div className="text-gray-600 text-xs capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'} className="text-gray-600 hover:text-yellow-400 transition-colors">
            {isDark ? <SunIcon className="w-3.5 h-3.5" /> : <MoonIcon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={logout} title="Sign Out" className="text-gray-600 hover:text-red-400 transition-colors">
            <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
