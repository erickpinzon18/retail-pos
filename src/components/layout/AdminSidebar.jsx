import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart2, 
  Store, 
  Users, 
  FileText, 
  LogOut,
  Settings,
  Tag,
  Crown,
  Shield,
  Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const mainItems = [
  { to: '/admin', icon: BarChart2, label: 'Dashboard', end: true },
  { to: '/admin/stores', icon: Store, label: 'Tiendas' },
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
];

const managementItems = [
  { to: '/admin/reports', icon: FileText, label: 'Reportes' },
  { to: '/admin/promotions', icon: Tag, label: 'Promociones' },
  { to: '/admin/logs', icon: Shield, label: 'Registros' },
  { to: '/admin/tokens', icon: Key, label: 'Tokens' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white flex flex-col shadow-xl rounded-r-2xl">
      {/* Profile Section */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800">{user?.name || 'Administrador'}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-purple-600 font-semibold">
                Admin
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-2.5 rounded-xl">
          <p className="text-xs text-gray-500">Panel de Administración</p>
          <p className="text-sm font-semibold text-gray-700">Control Total</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {/* Main Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Principal
          </p>
          <div className="space-y-1">
            {mainItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md'
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
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md'
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

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-1">
        {/* <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <Settings size={18} />
          <span className="text-sm">Configuración</span>
        </NavLink> */}
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
