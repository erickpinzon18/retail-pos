import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Off-Canvas on Mobile, Static on Desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl lg:shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <AdminSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Floating Toggle Button - Mobile Only */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all duration-200 group"
          title="Abrir Menú"
        >
          <Menu size={24} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full overflow-hidden flex flex-col">
        {/* Mobile Header (Title Context) */}
        <div className="lg:hidden p-4 bg-white shadow-sm flex items-center justify-center">
          <span className="font-bold text-gray-800 text-lg">Flea Market Admin</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
