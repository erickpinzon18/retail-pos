import { Outlet } from 'react-router-dom';
import StoreSidebar from './StoreSidebar';

export default function StoreLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <StoreSidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
