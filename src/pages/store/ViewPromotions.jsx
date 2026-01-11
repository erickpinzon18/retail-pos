import { useState } from 'react';
import { Plus, Pencil, XCircle, PlayCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

// Mock data
const mockPromotions = [
  { id: '1', title: '20% Descuento en Chamarras', type: 'percentage', status: 'active', endDate: '31 Dic, 2025', description: 'Aplica a todos los productos de la categoría "Chamarras".' },
  { id: '2', title: '2x1 en Camisas', type: '2x1', status: 'expired', endDate: '30 Sep, 2025', description: 'Compra una camisa y llévate la segunda de igual o menor precio gratis.' },
  { id: '3', title: 'Cupón BUENFIN25', type: 'coupon', status: 'scheduled', startDate: '15 Nov, 2025', description: '$100 de descuento en compras mayores a $1,000.' },
];

const statusFilters = ['Activas', 'Programadas', 'Expiradas'];

export default function ViewPromotions() {
  const [activeFilter, setActiveFilter] = useState('Activas');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleAddPromo = () => {
    setIsEditing(false);
    setShowPromoModal(true);
  };

  const handleEditPromo = () => {
    setIsEditing(true);
    setShowPromoModal(true);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return { border: 'border-green-500', badge: 'success', label: 'Activa' };
      case 'expired':
        return { border: 'border-gray-300', badge: 'gray', label: 'Expirada', opacity: 'opacity-75' };
      case 'scheduled':
        return { border: 'border-blue-400', badge: 'info', label: 'Programada' };
      default:
        return { border: 'border-gray-300', badge: 'gray', label: 'Desconocido' };
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'percentage':
        return <Badge variant="primary">Porcentaje</Badge>;
      case '2x1':
        return <Badge variant="purple">2x1</Badge>;
      case 'coupon':
        return <Badge variant="warning">Cupón</Badge>;
      default:
        return <Badge variant="gray">{type}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Promociones</h1>
          <p className="text-gray-500 mt-1">Crea y administra las ofertas de tu tienda.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={handleAddPromo}>
          Crear Promoción
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 p-1 bg-gray-200 rounded-lg w-fit">
        {statusFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${
              activeFilter === filter
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockPromotions.map((promo) => {
          const statusStyle = getStatusStyle(promo.status);
          return (
            <Card
              key={promo.id}
              padding={false}
              className={`flex flex-col border-t-4 ${statusStyle.border} ${statusStyle.opacity || ''}`}
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant={statusStyle.badge} className="mb-2">{statusStyle.label}</Badge>
                    <h3 className="font-bold text-gray-800 text-lg mt-2">{promo.title}</h3>
                  </div>
                  {getTypeBadge(promo.type)}
                </div>
                <p className="text-sm text-gray-600 mt-2">{promo.description}</p>
              </div>
              <div className="bg-gray-50 px-5 py-3 flex justify-between items-center text-sm text-gray-500">
                <span>
                  {promo.status === 'scheduled' ? `Inicia: ${promo.startDate}` : 
                   promo.status === 'expired' ? `Expiró: ${promo.endDate}` : 
                   `Vence: ${promo.endDate}`}
                </span>
                <div className="flex space-x-2">
                  <button onClick={handleEditPromo} className="text-gray-400 hover:text-indigo-600">
                    <Pencil size={18} />
                  </button>
                  {promo.status === 'expired' ? (
                    <button className="text-gray-400 hover:text-green-600">
                      <PlayCircle size={18} />
                    </button>
                  ) : (
                    <button className="text-gray-400 hover:text-red-600">
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Promotion Modal */}
      <Modal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        title={isEditing ? 'Editar Promoción' : 'Crear Nueva Promoción'}
        size="2xl"
      >
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nombre de la Promoción" placeholder="Ej: Venta Nocturna" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Promoción</label>
              <select className="w-full border border-gray-300 rounded-lg py-2 px-3">
                <option>Descuento por Porcentaje</option>
                <option>Descuento Fijo ($)</option>
                <option>2x1</option>
                <option>Cupón</option>
              </select>
            </div>
            <Input label="Valor del Descuento (%)" type="number" placeholder="Ej: 15" />
            <Input label="Código de Cupón (Opcional)" placeholder="Ej: VERANO25" />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Productos Aplicables</label>
              <select className="w-full border border-gray-300 rounded-lg py-2 px-3">
                <option>Toda la tienda</option>
                <option>Categoría: Camisas</option>
                <option>Categoría: Pantalones</option>
                <option>Productos específicos</option>
              </select>
            </div>
            <Input label="Fecha de Inicio" type="date" />
            <Input label="Fecha de Fin" type="date" />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Guardar Promoción</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
