import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
