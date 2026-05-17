import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Always-loaded (critical path)
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SubscriptionExpired from './components/SubscriptionExpired';
import LandingPage from './pages/LandingPage';
import RepairStatus from './pages/RepairStatus';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/dashboard/Dashboard';
import POS from './pages/pos/POS';
import RepairList from './pages/repairs/RepairList';
import RepairForm from './pages/repairs/RepairForm';
import Customers from './pages/customers/Customers';
import Inventory from './pages/inventory/Inventory';

// Always-loaded (onboarding — shown right after signup)
import Onboarding from './pages/onboarding/Onboarding';

// Lazy-loaded (secondary pages — not needed on first render)
const SADashboard      = lazy(() => import('./pages/superadmin/SADashboard'));
const Subscribers      = lazy(() => import('./pages/superadmin/Subscribers'));
const Pricing          = lazy(() => import('./pages/superadmin/Pricing'));
const SAReports        = lazy(() => import('./pages/superadmin/SAReports'));
const SACampaigns      = lazy(() => import('./pages/superadmin/SACampaigns'));
const SASettings       = lazy(() => import('./pages/superadmin/SASettings'));
const SAContentEditor  = lazy(() => import('./pages/superadmin/SAContentEditor'));
const SAAnalytics      = lazy(() => import('./pages/superadmin/SAAnalytics'));
const SACoupons        = lazy(() => import('./pages/superadmin/SACoupons'));
const LandingPrivacy   = lazy(() => import('./pages/PrivacyPolicy'));
const LandingTerms     = lazy(() => import('./pages/TermsOfService'));
const LandingContact   = lazy(() => import('./pages/Contact'));
const Display          = lazy(() => import('./pages/display/Display'));
const CustomerPortal   = lazy(() => import('./pages/display/CustomerPortal'));
const Activations      = lazy(() => import('./pages/activations/Activations'));
const Commissions      = lazy(() => import('./pages/commissions/Commissions'));
const Reports          = lazy(() => import('./pages/reports/Reports'));
const AdminUsers       = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPanel       = lazy(() => import('./pages/admin/AdminPanel'));
const Appointments     = lazy(() => import('./pages/appointments/Appointments'));
const BillPayments     = lazy(() => import('./pages/billpayments/BillPayments'));
const Purchasing       = lazy(() => import('./pages/purchasing/Purchasing'));
const TimeClock        = lazy(() => import('./pages/timeclock/TimeClock'));
const Loyalty          = lazy(() => import('./pages/loyalty/Loyalty'));
const Marketing        = lazy(() => import('./pages/marketing/Marketing'));
const Layaway          = lazy(() => import('./pages/layaway/Layaway'));
const Messages         = lazy(() => import('./pages/messages/Messages'));
const Buyback          = lazy(() => import('./pages/buyback/Buyback'));
const Estimates        = lazy(() => import('./pages/estimates/Estimates'));
const RecurringInvoices = lazy(() => import('./pages/invoices/RecurringInvoices'));
const InventoryCount   = lazy(() => import('./pages/inventory/InventoryCount'));
const Billing          = lazy(() => import('./pages/billing/Billing'));
const Subscriptions    = lazy(() => import('./pages/subscriptions/Subscriptions'));
const Serials          = lazy(() => import('./pages/serials/Serials'));
const Returns          = lazy(() => import('./pages/returns/Returns'));
const GiftCards        = lazy(() => import('./pages/giftcards/GiftCards'));
const Expenses         = lazy(() => import('./pages/expenses/Expenses'));
const RepairRequest    = lazy(() => import('./pages/repairrequest/RepairRequest'));
const Shifts           = lazy(() => import('./pages/shifts/Shifts'));
const Transfers        = lazy(() => import('./pages/transfers/Transfers'));
const PartsCatalog     = lazy(() => import('./pages/parts/PartsCatalog'));
const Storefront       = lazy(() => import('./pages/storefront/Storefront'));
const Goals            = lazy(() => import('./pages/goals/Goals'));
const Referral         = lazy(() => import('./pages/referrals/Referral'));

function Spin() {
  return (
    <div className="flex items-center justify-center h-full min-h-32">
      <div className="w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PrivateRoute({ children, roles }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  const { token, user, licenseError } = useAuthStore();

  if (token && licenseError && user?.role !== 'superadmin') {
    return <SubscriptionExpired error={licenseError} />;
  }

  return (
    <Suspense fallback={<Spin />}>
      <Routes>
        {/* ── Public pages ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<LandingPrivacy />} />
        <Route path="/terms" element={<LandingTerms />} />
        <Route path="/contact" element={<LandingContact />} />
        <Route path="/display" element={<Display />} />
        <Route path="/portal" element={<CustomerPortal />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/status" element={<RepairStatus />} />
        <Route path="/status/:ticketNumber" element={<RepairStatus />} />
        <Route path="/request" element={<RepairRequest />} />
        <Route path="/shop" element={<Storefront />} />

        <Route path="/login" element={
          token ? <Navigate to={user?.role === 'superadmin' ? '/superadmin' : '/app'} replace /> : <Login />
        } />
        <Route path="/signup" element={
          token ? <Navigate to={user?.role === 'superadmin' ? '/superadmin' : '/app'} replace /> : <Signup />
        } />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Superadmin portal ── */}
        <Route path="/superadmin" element={<PrivateRoute roles={['superadmin']}><SuperAdminLayout /></PrivateRoute>}>
          <Route index element={<SADashboard />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="analytics" element={<SAAnalytics />} />
          <Route path="reports" element={<SAReports />} />
          <Route path="campaigns" element={<SACampaigns />} />
          <Route path="settings" element={<SASettings />} />
          <Route path="content" element={<SAContentEditor />} />
          <Route path="coupons" element={<SACoupons />} />
        </Route>

        {/* ── POS App ── */}
        <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="onboarding" element={<Onboarding />} />
          <Route index element={user?.role === 'superadmin' ? <Navigate to="/superadmin" replace /> : <Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="repairs" element={<RepairList />} />
          <Route path="repairs/new" element={<RepairForm />} />
          <Route path="repairs/:id" element={<RepairForm />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="billing" element={<Billing />} />
          <Route path="activations" element={<Activations />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="bill-payments" element={<BillPayments />} />
          <Route path="purchasing" element={<Purchasing />} />
          <Route path="timeclock" element={<TimeClock />} />
          <Route path="loyalty" element={<Loyalty />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="layaway" element={<Layaway />} />
          <Route path="messages" element={<Messages />} />
          <Route path="returns" element={<Returns />} />
          <Route path="gift-cards" element={<GiftCards />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="buyback" element={<Buyback />} />
          <Route path="estimates" element={<Estimates />} />
          <Route path="recurring" element={<RecurringInvoices />} />
          <Route path="reports" element={<PrivateRoute roles={['superadmin', 'admin']}><Reports /></PrivateRoute>} />
          <Route path="marketing" element={<PrivateRoute roles={['superadmin', 'admin']}><Marketing /></PrivateRoute>} />
          <Route path="inv-counts" element={<PrivateRoute roles={['superadmin', 'admin']}><InventoryCount /></PrivateRoute>} />
          <Route path="serials" element={<Serials />} />
          <Route path="shifts" element={<PrivateRoute roles={['superadmin', 'admin']}><Shifts /></PrivateRoute>} />
          <Route path="transfers" element={<PrivateRoute roles={['superadmin', 'admin']}><Transfers /></PrivateRoute>} />
          <Route path="parts" element={<PartsCatalog />} />
          <Route path="goals" element={<PrivateRoute roles={['superadmin', 'admin']}><Goals /></PrivateRoute>} />
          <Route path="referrals" element={<Referral />} />
          <Route path="admin/users" element={<PrivateRoute roles={['superadmin', 'admin']}><AdminUsers /></PrivateRoute>} />
          <Route path="admin" element={<PrivateRoute roles={['superadmin', 'admin']}><AdminPanel /></PrivateRoute>} />
          <Route path="license-manager" element={<Navigate to="/superadmin/subscribers" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
