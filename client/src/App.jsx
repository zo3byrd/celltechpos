import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SADashboard from './pages/superadmin/SADashboard';
import Subscribers from './pages/superadmin/Subscribers';
import Pricing from './pages/superadmin/Pricing';
import SubscriptionExpired from './components/SubscriptionExpired';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import RepairList from './pages/repairs/RepairList';
import RepairForm from './pages/repairs/RepairForm';
import POS from './pages/pos/POS';
import Inventory from './pages/inventory/Inventory';
import InventoryCount from './pages/inventory/InventoryCount';
import Customers from './pages/customers/Customers';
import Activations from './pages/activations/Activations';
import Commissions from './pages/commissions/Commissions';
import Reports from './pages/reports/Reports';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPanel from './pages/admin/AdminPanel';
import Appointments from './pages/appointments/Appointments';
import BillPayments from './pages/billpayments/BillPayments';
import Purchasing from './pages/purchasing/Purchasing';
import TimeClock from './pages/timeclock/TimeClock';
import Loyalty from './pages/loyalty/Loyalty';
import Marketing from './pages/marketing/Marketing';
import Layaway from './pages/layaway/Layaway';
import Messages from './pages/messages/Messages';

function PrivateRoute({ children, roles }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { token, user, licenseError } = useAuthStore();

  // Show expired screen for non-superadmin users when license is blocked
  if (token && licenseError && user?.role !== 'superadmin') {
    return <SubscriptionExpired error={licenseError} />;
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to={user?.role === 'superadmin' ? '/superadmin' : '/'} replace /> : <Login />} />

      {/* ── Superadmin portal (completely separate from POS) ── */}
      <Route path="/superadmin" element={<PrivateRoute roles={['superadmin']}><SuperAdminLayout /></PrivateRoute>}>
        <Route index element={<SADashboard />} />
        <Route path="subscribers" element={<Subscribers />} />
        <Route path="pricing" element={<Pricing />} />
      </Route>

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={user?.role === 'superadmin' ? <Navigate to="/superadmin" replace /> : <Dashboard />} />
        <Route path="repairs" element={<RepairList />} />
        <Route path="repairs/new" element={<RepairForm />} />
        <Route path="repairs/:id" element={<RepairForm />} />
        <Route path="pos" element={<POS />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="customers" element={<Customers />} />
        <Route path="activations" element={<Activations />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="bill-payments" element={<BillPayments />} />
        <Route path="purchasing" element={<Purchasing />} />
        <Route path="timeclock" element={<TimeClock />} />
        <Route path="loyalty" element={<Loyalty />} />
        <Route path="layaway" element={<Layaway />} />
        <Route path="messages" element={<Messages />} />
        <Route path="reports" element={<PrivateRoute roles={['superadmin', 'admin']}><Reports /></PrivateRoute>} />
        <Route path="marketing" element={<PrivateRoute roles={['superadmin', 'admin']}><Marketing /></PrivateRoute>} />
        <Route path="inv-counts" element={<PrivateRoute roles={['superadmin', 'admin']}><InventoryCount /></PrivateRoute>} />
        <Route path="admin/users" element={<PrivateRoute roles={['superadmin', 'admin']}><AdminUsers /></PrivateRoute>} />
        <Route path="admin" element={<PrivateRoute roles={['superadmin', 'admin']}><AdminPanel /></PrivateRoute>} />
        <Route path="license-manager" element={<PrivateRoute roles={['superadmin']}><LicenseManager /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
