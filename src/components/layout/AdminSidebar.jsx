import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart2, 
  Store, 
  Users, 
  FileText, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', icon: BarChart2, label: 'Dashboard', end: true },
  { to: '/admin/stores', icon: Store, label: 'Tiendas' },
  { to: '/admin/users', icon: Users, label: 'Usuarios' },
  { to: '/admin/reports', icon: FileText, label: 'Reportes' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white flex flex-col shadow-lg">
      {/* Profile Section */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name || 'Admin General'}</p>
            <span className="text-xs text-purple-500 font-medium bg-purple-100 px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Section */}
      <div className="px-4 py-6 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-lg w-full"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
