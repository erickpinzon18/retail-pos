import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import StoreLayout from './components/layout/StoreLayout';

// Pages
import Login from './pages/store/Login';
import Dashboard from './pages/admin/Dashboard';
import ManageStores from './pages/admin/ManageStores';
import ManageUsers from './pages/admin/ManageUsers';
import ManagePromotions from './pages/admin/ManagePromotions';
import AdvancedReport from './pages/admin/AdvancedReport';
import GenerateReport from './pages/admin/GenerateReport';
import Checkout from './pages/store/Checkout';
import StoreSales from './pages/store/StoreSales';
import ManageProducts from './pages/store/ManageProducts';
import ManageClients from './pages/store/ManageClients';
import StoreConfig from './pages/store/StoreConfig';
import ViewPromotions from './pages/store/ViewPromotions';
import ClientHome from './pages/client/ClientHome';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect based on role
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/store" replace />;
  }

  return children;
}

export default function Router() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'admin' ? '/admin' : '/store'} replace />
          ) : (
            <Login />
          )
        } 
      />
      
      {/* Client Module - Public */}
      <Route path="/client" element={<ClientHome />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="stores" element={<ManageStores />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="reports" element={<AdvancedReport />} />
        <Route path="reports/generate" element={<GenerateReport />} />
        <Route path="promotions" element={<ManagePromotions />} />
      </Route>

      {/* Store Routes */}
      <Route
        path="/store"
        element={
          <ProtectedRoute allowedRoles={['admin', 'seller']}>
            <StoreLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Checkout />} />
        <Route path="sales" element={<StoreSales />} />
        <Route path="products" element={<ManageProducts />} />
        <Route path="clients" element={<ManageClients />} />
        <Route path="config" element={<StoreConfig />} />
        <Route path="promotions" element={<ViewPromotions />} />
      </Route>

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
