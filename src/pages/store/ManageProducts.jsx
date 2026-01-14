import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAllProducts, getProductCategories, create, update, remove } from '../../api/firestoreService';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    sku: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(),
        getProductCategories()
      ]);
      setProducts(productsData);
      setCategories(['Todos', ...categoriesData]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: categories[1] || '',
      price: '',
      cost: '',
      sku: ''
    });
    setSelectedProduct(null);
  };

  const handleAddProduct = () => {
    setIsEditing(false);
    resetForm();
    setFormData(prev => ({ ...prev, category: categories[1] || '' }));
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      sku: product.sku || ''
    });
    setShowProductModal(true);
  };

  const handleDeleteClick = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const productData = {
        name: formData.name.trim(),
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        sku: formData.sku.trim()
      };
      
      if (isEditing && selectedProduct) {
        await update('products', selectedProduct.id, productData);
      } else {
        await create('products', productData);
      }
      
      await fetchData();
      setShowProductModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      setSaving(true);
      await remove('products', selectedProduct.id);
      await fetchData();
      setShowDeleteModal(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.sku?.includes(searchTerm);
    const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate margin
  const getMargin = (price, cost) => {
    if (!price || !cost || cost === 0) return null;
    return Math.round(((price - cost) / price) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Productos</h1>
          <p className="text-gray-500 mt-1">
            {products.length} productos registrados
          </p>
        </div>
        <Button icon={<Plus size={20} />} onClick={handleAddProduct}>
          Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex space-x-2 p-1 bg-gray-200 rounded-xl overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-72 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando productos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No hay productos {activeCategory !== 'Todos' ? `en ${activeCategory}` : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredProducts.map((product) => {
            const margin = getMargin(product.price, product.cost);
            
            return (
              <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
                <div className="h-16 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white/80">
                    {product.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 truncate" title={product.name}>{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="gray">{product.category}</Badge>
                    {product.sku && (
                      <span className="text-xs text-gray-400">{product.sku}</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xl font-extrabold text-indigo-600">
                        {formatCurrency(product.price || 0)}
                      </p>
                      {product.cost > 0 && (
                        <p className="text-xs text-gray-400">
                          Costo: {formatCurrency(product.cost)}
                        </p>
                      )}
                    </div>
                    {margin !== null && (
                      <Badge variant={margin >= 30 ? 'success' : margin >= 15 ? 'warning' : 'danger'}>
                        {margin}%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex space-x-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-1"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Producto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 text-lg"
              placeholder="Ej: Pantalón de Mezclilla"
              autoFocus
            />
          </div>

          {/* Categoría y SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar...</option>
                {categories.filter(c => c !== 'Todos').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleFormChange('sku', e.target.value)}
                className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Precio y Costo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de Venta <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleFormChange('price', e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl py-3 pl-8 pr-4 focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => handleFormChange('cost', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-3 pl-8 pr-4 focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Margin Preview */}
          {formData.price && formData.cost && parseFloat(formData.cost) > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Margen de ganancia:</span>
              <span className={`font-bold ${
                getMargin(parseFloat(formData.price), parseFloat(formData.cost)) >= 30 
                  ? 'text-green-600' 
                  : getMargin(parseFloat(formData.price), parseFloat(formData.cost)) >= 15 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                {getMargin(parseFloat(formData.price), parseFloat(formData.cost))}%
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setShowProductModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm" showCloseButton={false}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
            <Trash2 className="text-red-600" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">¿Eliminar Producto?</h3>
          <p className="mt-2 text-sm text-gray-500">
            <strong>{selectedProduct?.name}</strong>
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
