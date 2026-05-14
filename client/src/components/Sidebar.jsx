import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  HomeIcon, WrenchScrewdriverIcon, ShoppingCartIcon,
  CubeIcon, UsersIcon, SignalIcon, CurrencyDollarIcon,
  ChartBarIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon,
  CalendarDaysIcon, ClockIcon, TruckIcon, StarIcon,
  MegaphoneIcon, BanknotesIcon, ArchiveBoxIcon,
  ShieldCheckIcon, KeyIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const mainNav = [
  { to: '/app',          label: 'Dashboard',     icon: HomeIcon, exact: true },
  { to: '/app/pos',      label: 'Point of Sale', icon: ShoppingCartIcon },
  { to: '/app/repairs',  label: 'Repairs',       icon: WrenchScrewdriverIcon },
  { to: '/app/customers',label: 'Customers',     icon: UsersIcon },
];
const opsNav = [
  { to: '/app/appointments',  label: 'Appointments',   icon: CalendarDaysIcon },
  { to: '/app/inventory',     label: 'Inventory',       icon: CubeIcon },
  { to: '/app/purchasing',    label: 'Purchase Orders', icon: TruckIcon },
  { to: '/app/bill-payments', label: 'Bill Payments',   icon: BanknotesIcon },
  { to: '/app/activations',   label: 'Activations',     icon: SignalIcon },
  { to: '/app/layaway',       label: 'Layaway',         icon: ArchiveBoxIcon },
];
const staffNav = [
  { to: '/app/timeclock',   label: 'Time Clock',  icon: ClockIcon },
  { to: '/app/commissions', label: 'Commissions', icon: CurrencyDollarIcon },
];
const growthNav = [
  { to: '/app/loyalty',   label: 'Loyalty',   icon: StarIcon },
  { to: '/app/marketing', label: 'Marketing', icon: MegaphoneIcon },
  { to: '/app/messages',  label: 'Messages',  icon: ChatBubbleLeftRightIcon },
];
const adminNav = [
  { to: '/app/reports',    label: 'Reports',    icon: ChartBarIcon },
  { to: '/app/inv-counts', label: 'Inv. Count', icon: ShieldCheckIcon },
  { to: '/app/admin',      label: 'Admin',       icon: Cog6ToothIcon },
];
const superNav = [
  { to: '/app/license-manager', label: 'License Manager', icon: KeyIcon },
];

function NavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink to={to} end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-green-900 text-green-200 border-l-2 border-green-400'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100 border-l-2 border-transparent'
        }`
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#161b27', borderRight: '1px solid #1f2937' }}>
      {/* Logo */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid #1f2937' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#14532d' }}>C</div>
          <div className="min-w-0">
            <div className="text-white font-bold text-xs leading-tight">CellTechPOS</div>
            <div className="text-gray-500 text-xs truncate">{user?.store?.name || '...'}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {mainNav.map(i => <NavItem key={i.to} {...i} />)}

        <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Ops</div>
        {opsNav.map(i => <NavItem key={i.to} {...i} />)}

        <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff</div>
        {staffNav.map(i => <NavItem key={i.to} {...i} />)}

        <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Growth</div>
        {growthNav.map(i => <NavItem key={i.to} {...i} />)}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</div>
            {adminNav.map(i => <NavItem key={i.to} {...i} />)}
          </>
        )}
        {isSuperadmin && (
          <>
            <div className="pt-4 pb-1 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ color: '#4ade80' }}>Owner</div>
            {superNav.map(i => <NavItem key={i.to} {...i} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-2 py-2" style={{ borderTop: '1px solid #1f2937' }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#14532d' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-300 text-xs truncate font-medium">{user?.name}</div>
            <div className="text-gray-600 text-xs capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={logout} title="Sign Out" className="text-gray-600 hover:text-red-400 transition-colors">
            <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
