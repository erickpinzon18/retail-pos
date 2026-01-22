import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Grid3X3, 
  Receipt, 
  Users, 
  Package, 
  Settings, 
  LogOut,
  Tag,
  Bell,
  X,
  Clock,
  Store,
  DollarSign,
  AlertTriangle,
  PackageOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { getTodayCashCloses, getSalesByStore } from '../../api/firestoreService';

// Cash limit for triggering corte alert
const CASH_LIMIT = 2000;

const generalItems = [
  { to: '/store', icon: Grid3X3, label: 'Punto de Venta', end: true },
  { to: '/store/sales', icon: Receipt, label: 'Ventas' },
];

const managementItems = [
  { to: '/store/clients', icon: Users, label: 'Clientes' },
  { to: '/store/apartados', icon: PackageOpen, label: 'Apartados' },
  { to: '/store/products', icon: Package, label: 'Productos' },
  { to: '/store/promotions', icon: Tag, label: 'Promociones' },
];

export default function StoreSidebar() {
  const { user, logout } = useAuth();
  const { storeId, storeName } = useStore();
  const navigate = useNavigate();
  
  const [cashCloses, setCashCloses] = useState([]);
  const [currentCash, setCurrentCash] = useState(0);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Fetch cash closes and sales on mount
  useEffect(() => {
    const fetchAlertData = async () => {
      if (!storeId) return;
      
      try {
        const [closes, sales] = await Promise.all([
          getTodayCashCloses(storeId),
          getSalesByStore(storeId)
        ]);
        
        // Filter today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = sales.filter(sale => {
          const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
          return saleDate >= today;
        });
        
        // Calculate current cash
        const totalCash = todaySales
          .filter(s => s.paymentMethod === 'cash')
          .reduce((sum, s) => sum + (s.total || 0), 0);
        
        const closedCash = closes.reduce((sum, c) => sum + (c.cashAmount || 0), 0);
        
        setCashCloses(closes);
        setCurrentCash(totalCash - closedCash);
      } catch (error) {
        console.error('Error fetching alert data:', error);
      }
    };
    
    fetchAlertData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAlertData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [storeId]);

  // Generate alerts based on cash limit only
  const alerts = useMemo(() => {
    const result = [];
    
    // Check cash limit - alert when $2K+ in register
    if (currentCash >= CASH_LIMIT) {
      result.push({
        id: 'cashLimit',
        type: 'danger',
        title: 'Hacer corte de caja',
        message: `Límite de caja alcanzado (límite $${CASH_LIMIT})`,
        icon: DollarSign,
        link: '/store/sales'
      });
    }
    
    return result.filter(a => !dismissedAlerts.includes(a.id));
  }, [currentCash, dismissedAlerts]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dismissAlert = (id) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  const handleAlertClick = (link) => {
    navigate(link);
  };

  return (
    <aside className="w-64 bg-white flex flex-col shadow-xl rounded-r-2xl">
      {/* Profile Section */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm">{user?.name || 'Usuario'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded-full">
                Cajero
              </span>
              {user?.type && (
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                  user.type === 'weekend' 
                    ? 'text-purple-600 bg-purple-100' 
                    : 'text-blue-600 bg-blue-100'
                }`}>
                  {user.type === 'weekend' ? 'Fin de semana' : 'Entre semana'}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Active Store */}
        {storeName && (
          <div className="bg-gradient-to-r from-gray-50 to-indigo-50 p-2.5 rounded-xl flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-lg shadow-sm">
              <Store size={14} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 text-xs truncate">{storeName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 px-2 mb-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Alertas</span>
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                onClick={() => handleAlertClick(alert.link)}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  alert.type === 'warning' 
                    ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100' 
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                <alert.icon size={16} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{alert.title}</p>
                  <p className="text-xs opacity-80">{alert.message}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                  className="p-1 hover:bg-white/50 rounded transition flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {/* General Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            General
          </p>
          <div className="space-y-1">
            {generalItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-sm">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Management Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Gestión
          </p>
          <div className="space-y-1">
            {managementItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-sm">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Settings and Logout */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-1">

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl w-full transition-all duration-200"
        >
          <LogOut size={18} />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
