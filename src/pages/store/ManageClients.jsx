import { useState } from 'react';
import { Plus, Users2, Star, RotateCcw, Download } from 'lucide-react';
import Card, { CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import StatsCard from '../../components/shared/StatsCard';
import { formatCurrency } from '../../utils/formatCurrency';

// Mock data
const mockClients = [
  { id: '1', name: 'Juan Pérez', email: 'juan.perez@example.com', phone: '427-123-4567', isVip: true },
  { id: '2', name: 'María López', email: 'maria.lopez@example.com', phone: '427-987-6543', isVip: false },
];

const mockApartados = [
  { id: '1', client: 'Carlos Sánchez', product: 'Chamarra de Piel', total: 1500, paid: 500, status: 'active' },
  { id: '2', client: 'Laura Méndez', product: 'Bolsa de Mano', total: 800, paid: 300, status: 'expired' },
];

export default function ManageClients() {
  const [showClientModal, setShowClientModal] = useState(false);
  const [showApartadoModal, setShowApartadoModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [clientFilter, setClientFilter] = useState('all');

  const handleAddClient = () => {
    setIsEditing(false);
    setShowClientModal(true);
  };

  const handleViewClient = () => {
    setIsEditing(true);
    setShowClientModal(true);
  };

  const tabs = [
    {
      id: 'clientes',
      label: 'Clientes',
      content: (
        <div>
          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
              {['all', 'vip', 'normal'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setClientFilter(filter)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${
                    clientFilter === filter
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  {filter === 'all' ? 'Todos' : filter === 'vip' ? 'VIP' : 'Normales'}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar cliente por nombre o email..."
              className="w-full max-w-xs border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Clients Table */}
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Teléfono</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {mockClients.map((client) => (
                <tr key={client.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4">{client.email}</td>
                  <td className="px-6 py-4">{client.phone}</td>
                  <td className="px-6 py-4">
                    <Badge variant={client.isVip ? 'warning' : 'gray'}>
                      {client.isVip ? 'VIP' : 'Normal'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={handleViewClient}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'apartados',
      label: 'Apartados',
      content: (
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Producto</th>
              <th className="px-6 py-3">Total Apartado</th>
              <th className="px-6 py-3">Monto Pagado</th>
              <th className="px-6 py-3">Estatus</th>
              <th className="px-6 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {mockApartados.map((apt) => (
              <tr key={apt.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{apt.client}</td>
                <td className="px-6 py-4">{apt.product}</td>
                <td className="px-6 py-4 font-semibold">{formatCurrency(apt.total)}</td>
                <td className="px-6 py-4 text-green-600 font-semibold">{formatCurrency(apt.paid)}</td>
                <td className="px-6 py-4">
                  <Badge variant={apt.status === 'active' ? 'success' : 'danger'}>
                    {apt.status === 'active' ? 'Activo' : 'Vencido'}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setShowApartadoModal(true)}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
        <Button icon={<Plus size={20} />} onClick={handleAddClient}>
          Registrar Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total de Clientes"
          value="1,245"
          icon={<Users2 size={24} />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Miembros VIP"
          value="187"
          icon={<Star size={24} />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <StatsCard
          title="Tasa de Retorno"
          value="68%"
          icon={<RotateCcw size={24} />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <Tabs tabs={tabs} defaultTab="clientes" />
      </Card>

      {/* Client Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title={isEditing ? 'Detalles del Cliente' : 'Registrar Nuevo Cliente'}
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nombre Completo" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
              <select className="w-full border border-gray-300 rounded-lg py-2 px-3">
                <option>Normal</option>
                <option>VIP</option>
              </select>
            </div>
            <Input label="Email" type="email" />
            <Input label="Teléfono" type="tel" />
          </div>

          {/* QR Code Section (visible when editing) */}
          {isEditing && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Código QR del Cliente</h3>
              <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-lg">
                <div className="w-32 h-32 bg-white flex items-center justify-center border rounded-lg">
                  QR Code
                </div>
                <div>
                  <p className="text-sm text-gray-600">Este es el ID único del cliente.</p>
                  <p className="text-sm text-gray-600">Escanéalo para usarlo en todas las sucursales.</p>
                  <button
                    type="button"
                    className="mt-3 flex items-center space-x-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                  >
                    <Download size={16} />
                    <span>Descargar QR</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit">Guardar Cliente</Button>
          </div>
        </form>
      </Modal>

      {/* Apartado Detail Modal */}
      <Modal
        isOpen={showApartadoModal}
        onClose={() => setShowApartadoModal(false)}
        title="Detalle de Apartado"
        size="3xl"
      >
        <p className="text-sm text-gray-500 mb-6">Cliente: Carlos Sánchez - Chamarra de Piel</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Payment History */}
          <div className="md:col-span-3">
            <h3 className="font-semibold text-lg mb-3">Historial de Pagos</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">Pago Inicial</p>
                  <p className="text-xs text-gray-500">01 de Oct, 2025 - Efectivo</p>
                </div>
                <p className="font-bold text-gray-800">{formatCurrency(500)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">Abono</p>
                  <p className="text-xs text-gray-500">15 de Oct, 2025 - Tarjeta</p>
                </div>
                <p className="font-bold text-gray-800">{formatCurrency(250)}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <div className="bg-indigo-50 p-4 rounded-lg space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total del Producto:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(1500)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Pagado:</span>
                <span className="font-semibold text-green-600">{formatCurrency(750)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span className="text-indigo-800">Monto Restante:</span>
                <span className="text-indigo-800">{formatCurrency(750)}</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Agregar Nuevo Pago</h4>
              <div className="flex space-x-2">
                <Input type="number" placeholder="Monto" className="flex-1" />
                <Button icon={<Plus size={20} />} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-4">
          <Button variant="secondary">Imprimir Estado de Cuenta</Button>
          <Button variant="success">Cerrar Apartado</Button>
        </div>
      </Modal>
    </div>
  );
}
