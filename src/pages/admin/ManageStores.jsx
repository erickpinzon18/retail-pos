import { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Card, { CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import ComparisonChart from '../../components/shared/ComparisonChart';
import { formatCurrency } from '../../utils/formatCurrency';

// Mock data
const mockStores = [
  { id: '1', name: 'Tienda Centro', address: 'Av. Principal #123', sales: 450123.80, users: 5 },
  { id: '2', name: 'Tienda Plaza Mayor', address: 'Blvd. Universitario #540', sales: 380560.20, users: 4 },
  { id: '3', name: 'Tienda Sur', address: 'Carretera 57 #8900', sales: 290800.00, users: 4 },
];

const mockUsers = [
  { id: '1', name: 'Ana García', role: 'Cajero' },
  { id: '2', name: 'Luis Martínez', role: 'Gerente' },
];

export default function ManageStores() {
  const [selectedStore, setSelectedStore] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showUserStatsModal, setShowUserStatsModal] = useState(false);

  const handleSelectStore = (store) => {
    setSelectedStore(store);
  };

  const handleBack = () => {
    setSelectedStore(null);
  };

  if (selectedStore) {
    return (
      <StoreDetailView
        store={selectedStore}
        onBack={handleBack}
        onAddUser={() => setShowAddUserModal(true)}
        onViewUserStats={() => setShowUserStatsModal(true)}
        showAddUserModal={showAddUserModal}
        setShowAddUserModal={setShowAddUserModal}
        showUserStatsModal={showUserStatsModal}
        setShowUserStatsModal={setShowUserStatsModal}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Tiendas</h1>
        <p className="text-gray-500 mt-1">Supervisa y configura cada una de tus sucursales.</p>
      </div>

      {/* Store Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStores.map((store) => (
          <Card key={store.id} className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">{store.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{store.address}</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas (mes):</span>
                <span className="font-semibold text-green-600">{formatCurrency(store.sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usuarios Activos:</span>
                <span className="font-semibold">{store.users}</span>
              </div>
            </div>
            <Button
              className="mt-auto w-full"
              onClick={() => handleSelectStore(store)}
            >
              Gestionar Tienda
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StoreDetailView({
  store,
  onBack,
  onAddUser,
  onViewUserStats,
  showAddUserModal,
  setShowAddUserModal,
  showUserStatsModal,
  setShowUserStatsModal,
}) {
  const tabs = [
    {
      id: 'resumen',
      label: 'Resumen',
      content: (
        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-4">Configurar Nombre</CardTitle>
            <Input value={store.name} className="mb-3" />
            <Button variant="secondary" className="w-full">Guardar Cambios</Button>
          </Card>
          <Card>
            <CardTitle className="mb-4">Estadísticas (Último Mes)</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Ventas Totales</p>
                <p className="text-xl font-bold">{formatCurrency(450123)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Ticket Promedio</p>
                <p className="text-xl font-bold">{formatCurrency(145.11)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Nuevos Clientes</p>
                <p className="text-xl font-bold">89</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Artículos Vendidos</p>
                <p className="text-xl font-bold">4,521</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Ventas: Entre Semana vs. Fin de Semana
            </h3>
            <ComparisonChart weekdayValue={315000} weekendValue={135123} />
          </Card>
        </div>
      ),
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      content: (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <CardTitle>Usuarios de la Tienda</CardTitle>
            <button onClick={onAddUser} className="text-indigo-600 hover:text-indigo-800">
              <Plus size={24} />
            </button>
          </div>
          <ul className="space-y-3">
            {mockUsers.map((user) => (
              <li key={user.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-gray-500 text-sm">{user.role}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onViewUserStats}
                    className="font-medium text-indigo-600 hover:underline text-sm"
                  >
                    Ver Estadísticas
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ),
    },
    {
      id: 'productos',
      label: 'Productos Populares',
      content: (
        <Card>
          <CardTitle className="mb-4">Top 5 Productos Más Vendidos</CardTitle>
          <ul className="space-y-3">
            <li className="flex items-center space-x-4 p-2">
              <span className="text-lg font-bold text-gray-400">1</span>
              <div className="w-12 h-12 rounded-lg bg-gray-100"></div>
              <div className="flex-grow">
                <p className="font-semibold">Pantalón de Mezclilla</p>
                <p className="text-sm text-gray-500">SKU: 12345</p>
              </div>
              <div className="text-right">
                <p className="font-bold">250</p>
                <p className="text-xs text-gray-500">unidades</p>
              </div>
            </li>
          </ul>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Detalles de {store.name}</h1>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="resumen" />

      {/* Add User Modal */}
      <Modal isOpen={showAddUserModal} onClose={() => setShowAddUserModal(false)} title="Agregar Nuevo Usuario">
        <form className="space-y-4">
          <Input placeholder="Nombre Completo" />
          <Input type="email" placeholder="Email" />
          <select className="w-full border border-gray-300 rounded-lg p-3">
            <option disabled selected>Seleccionar Rol</option>
            <option>Cajero</option>
            <option>Gerente</option>
          </select>
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="secondary" onClick={() => setShowAddUserModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* User Stats Modal */}
      <Modal isOpen={showUserStatsModal} onClose={() => setShowUserStatsModal(false)} title="Estadísticas de Ana García" size="2xl">
        <p className="text-sm text-gray-500 mb-6">Cajero - {store.name}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">Ventas (mes)</p>
            <p className="text-lg font-bold">{formatCurrency(58430)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">Órdenes</p>
            <p className="text-lg font-bold">412</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">Ticket Promedio</p>
            <p className="text-lg font-bold">{formatCurrency(141.82)}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
