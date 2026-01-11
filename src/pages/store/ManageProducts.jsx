import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';

// Mock data
const mockProducts = [
  { id: '1', name: 'Pantalón de Mezclilla', sku: '123456789', price: 899.90, stock: 50, category: 'Pantalones' },
  { id: '2', name: 'Camisa Casual de Lino', sku: '987654321', price: 649.00, stock: 120, category: 'Camisas' },
  { id: '3', name: 'Chamarra de Piel', sku: '456789123', price: 2499.50, stock: 5, category: 'Chamarras' },
  { id: '4', name: 'Playera Básica', sku: '789123456', price: 299.00, stock: 250, category: 'Camisas' },
  { id: '5', name: 'Jeans Skinny Fit', sku: '321654987', price: 999.00, stock: 0, category: 'Pantalones' },
  { id: '6', name: 'Sudadera con Capucha', sku: '654987321', price: 1200.00, stock: 80, category: 'Chamarras' },
];

const categories = ['Todos', 'Pantalones', 'Camisas', 'Chamarras'];

export default function ManageProducts() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleAddProduct = () => {
    setIsEditing(false);
    setShowProductModal(true);
  };

  const handleEditProduct = () => {
    setIsEditing(true);
    setShowProductModal(true);
  };

  const filteredProducts = mockProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.sku.includes(searchTerm);
    const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockBadge = (stock) => {
    if (stock === 0) return <Badge variant="danger">Agotado</Badge>;
    if (stock <= 10) return <Badge variant="warning">Bajo Stock: {stock}</Badge>;
    return <Badge variant="success">En Stock: {stock}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Productos</h1>
          <p className="text-gray-500 mt-1">Administra tu inventario y categorías.</p>
        </div>
        <Button icon={<Plus size={20} />} onClick={handleAddProduct}>
          Crear Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex space-x-2 p-1 bg-gray-200 rounded-lg overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar producto por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} padding={false} className="overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
              <span className="text-4xl font-bold text-indigo-300">
                {product.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-800">{product.name}</h3>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-lg font-extrabold text-indigo-600">
                  {formatCurrency(product.price)}
                </span>
                {getStockBadge(product.stock)}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                <button
                  onClick={handleEditProduct}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2 rounded-lg hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}
        size="2xl"
      >
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nombre del Producto" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select className="w-full border border-gray-300 rounded-lg py-2 px-3">
                <option>Pantalones</option>
                <option>Camisas</option>
                <option>Chamarras</option>
              </select>
            </div>
            <Input label="Precio de Venta ($)" type="number" placeholder="0.00" />
            <Input label="Costo ($)" type="number" placeholder="0.00" />
            <Input label="SKU (Código de Barras)" />
            <Input label="Cantidad en Stock" type="number" placeholder="0" />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                rows="3"
                className="w-full border border-gray-300 rounded-lg py-2 px-3"
              />
            </div>

          </div>
          <div className="flex justify-end">
            <Button type="submit">Guardar Producto</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="md" showCloseButton={false}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">¿Eliminar Producto?</h3>
          <p className="mt-2 text-sm text-gray-500">
            Esta acción es irreversible. Se eliminará permanentemente el producto del inventario.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger">Sí, Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
