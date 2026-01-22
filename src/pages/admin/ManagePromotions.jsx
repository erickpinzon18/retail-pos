import { useState, useEffect, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  Percent, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Store,
  Search,
  Power
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, create, update, remove } from '../../api/firestoreService';

const statusFilters = ['Todas', 'Activas', 'Programadas', 'Expiradas'];

export default function ManagePromotions() {
  const [promotions, setPromotions] = useState([]);
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    value: '',
    storeIds: [],
    status: true,
    startAt: new Date().toISOString().split('T')[0],
    finishAt: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [promosData, storesData, productsData] = await Promise.all([
        getAll('promotions'),
        getAll('stores'),
        getAll('products')
      ]);
      setPromotions(promosData);
      setStores(storesData);
      
      // Extract unique categories from products
      const uniqueCategories = [...new Set(productsData.map(p => p.category).filter(Boolean))].sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Categorize promotions
  const categorizedPromotions = useMemo(() => {
    const now = new Date();
    
    return promotions.map(promo => {
      // Use startAt if available, otherwise fallback to createdAt
      const startField = promo.startAt || promo.createdAt;
      const startDate = startField?.toDate ? startField.toDate() : new Date(startField);
      const finishDate = promo.finishAt?.toDate ? promo.finishAt.toDate() : new Date(promo.finishAt);
      
      let promoStatus;
      if (!promo.status) {
        promoStatus = 'inactive';
      } else if (finishDate < now) {
        promoStatus = 'expired';
      } else if (startDate > now) {
        promoStatus = 'scheduled';
      } else {
        promoStatus = 'active';
      }
      
      return { ...promo, promoStatus };
    });
  }, [promotions]);

  // Filter promotions
  const filteredPromotions = useMemo(() => {
    let filtered = categorizedPromotions;
    
    // Apply status filter
    if (activeFilter === 'Activas') {
      filtered = filtered.filter(p => p.promoStatus === 'active');
    } else if (activeFilter === 'Programadas') {
      filtered = filtered.filter(p => p.promoStatus === 'scheduled');
    } else if (activeFilter === 'Expiradas') {
      filtered = filtered.filter(p => p.promoStatus === 'expired' || p.promoStatus === 'inactive');
    }
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [categorizedPromotions, activeFilter, searchTerm]);

  const counts = useMemo(() => ({
    total: categorizedPromotions.length,
    active: categorizedPromotions.filter(p => p.promoStatus === 'active').length,
    scheduled: categorizedPromotions.filter(p => p.promoStatus === 'scheduled').length,
    expired: categorizedPromotions.filter(p => p.promoStatus === 'expired' || p.promoStatus === 'inactive').length
  }), [categorizedPromotions]);

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      value: '',
      storeIds: [],
      storeIds: [],
      status: true,
      startAt: new Date().toISOString().split('T')[0],
      finishAt: ''
    });
    setSelectedPromo(null);
  };

  const handleAddPromo = () => {
    setIsEditing(false);
    resetForm();
    setShowModal(true);
  };

  const handleEditPromo = (promo) => {
    setIsEditing(true);
    setSelectedPromo(promo);
    
    const finishDate = promo.finishAt?.toDate ? promo.finishAt.toDate() : new Date(promo.finishAt);
    
    setFormData({
      title: promo.title || '',
      category: promo.category || '',
      value: promo.value || '',
      storeIds: promo.storeIds || [],
      status: promo.status !== false,
      startAt: (promo.startAt?.toDate ? promo.startAt.toDate() : new Date(promo.startAt || promo.createdAt)).toISOString().split('T')[0],
      finishAt: finishDate.toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDeleteClick = (promo) => {
    setSelectedPromo(promo);
    setShowDeleteModal(true);
  };

  const handleToggleStatus = async (promo) => {
    try {
      await update('promotions', promo.id, { status: !promo.status });
      await fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const promoData = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        value: Number(formData.value),
        storeIds: formData.storeIds.length === 0 ? ['global'] : formData.storeIds,
        storeIds: formData.storeIds.length === 0 ? ['global'] : formData.storeIds,
        status: formData.status,
        type: "percentage",
        startAt: new Date(formData.startAt),
        finishAt: new Date(formData.finishAt)
      };
      
      if (isEditing && selectedPromo) {
        await update('promotions', selectedPromo.id, promoData);
      } else {
        promoData.createdAt = new Date();
        await create('promotions', promoData);
      }
      
      await fetchData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Error al guardar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPromo) return;
    
    try {
      setSaving(true);
      await remove('promotions', selectedPromo.id);
      await fetchData();
      setShowDeleteModal(false);
      setSelectedPromo(null);
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('Error al eliminar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const handleStoreToggle = (storeId) => {
    setFormData(prev => ({
      ...prev,
      storeIds: prev.storeIds.includes(storeId)
        ? prev.storeIds.filter(id => id !== storeId)
        : [...prev.storeIds, storeId]
    }));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { border: 'border-green-500', bg: 'bg-green-50', badge: 'success', label: 'Activa', icon: CheckCircle, iconColor: 'text-green-500' };
      case 'scheduled':
        return { border: 'border-blue-500', bg: 'bg-blue-50', badge: 'info', label: 'Programada', icon: Clock, iconColor: 'text-blue-500' };
      case 'expired':
      case 'inactive':
        return { border: 'border-gray-300', bg: 'bg-gray-50', badge: 'gray', label: status === 'inactive' ? 'Inactiva' : 'Expirada', icon: XCircle, iconColor: 'text-gray-400', opacity: 'opacity-75' };
      default:
        return { border: 'border-gray-300', bg: 'bg-gray-50', badge: 'gray', label: 'Desconocido', icon: AlertCircle, iconColor: 'text-gray-400' };
    }
  };

  const getStoreName = (storeId) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || storeId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando promociones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Promociones</h1>
          <p className="text-gray-500 mt-1">{promotions.length} promociones configuradas</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleAddPromo}>
          Nueva Promoción
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-md border-l-4 border-indigo-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Tag size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-800">{counts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activas</p>
              <p className="text-2xl font-bold text-gray-800">{counts.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Programadas</p>
              <p className="text-2xl font-bold text-gray-800">{counts.scheduled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md border-l-4 border-gray-400">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-xl">
              <XCircle size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expiradas</p>
              <p className="text-2xl font-bold text-gray-800">{counts.expired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar promoción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex space-x-2 p-1 bg-gray-200 rounded-xl w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-hide">
          {statusFilters.map((filter) => {
            const count = filter === 'Todas' ? counts.total :
                          filter === 'Activas' ? counts.active : 
                          filter === 'Programadas' ? counts.scheduled : counts.expired;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 flex-shrink-0 ${
                  activeFilter === filter
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeFilter === filter ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-300 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Promotions Grid */}
      {filteredPromotions.length === 0 ? (
        <div className="text-center py-12">
          <Tag size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No hay promociones</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromotions.map((promo) => {
            const statusConfig = getStatusConfig(promo.promoStatus);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div
                key={promo.id}
                className={`bg-white rounded-xl shadow-md overflow-hidden border-t-4 ${statusConfig.border} ${statusConfig.opacity || ''}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleToggleStatus(promo)}
                        className={`p-1.5 rounded-lg transition ${promo.status ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                        title={promo.status ? 'Desactivar' : 'Activar'}
                      >
                        <Power size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditPromo(promo)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(promo)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-800 text-lg mb-2">{promo.title}</h3>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-sm font-bold">
                      <Percent size={14} />
                      <span>{promo.value}% OFF</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Tag size={14} />
                      <span>{promo.category || 'Todas'}</span>
                    </div>
                  </div>
                  
                  {promo.storeIds && promo.storeIds.length > 0 && !promo.storeIds.includes('global') ? (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Store size={12} />
                      <span>{promo.storeIds.map(id => getStoreName(id)).join(', ')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-indigo-600 mb-2">
                      <Store size={12} />
                      <span>Todas las tiendas</span>
                    </div>
                  )}
                </div>
                
                <div className={`px-5 py-3 ${statusConfig.bg} border-t border-gray-100`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} />
                      <span>
                        {promo.promoStatus === 'scheduled' 
                          ? `Inicia: ${formatDate(promo.startAt || promo.createdAt)}`
                          : promo.promoStatus === 'expired' || promo.promoStatus === 'inactive'
                          ? `Expiró: ${formatDate(promo.finishAt)}`
                          : `Termina: ${formatDate(promo.finishAt)}`
                        }
                      </span>
                    </div>
                    <StatusIcon size={18} className={statusConfig.iconColor} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Editar Promoción' : 'Nueva Promoción'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Descuento de Verano"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descuento (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                required
                min="1"
                max="100"
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={formData.startAt}
                onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Expiración <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.finishAt}
                onChange={(e) => setFormData(prev => ({ ...prev, finishAt: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiendas (dejar vacío para todas)
            </label>
            <div className="flex flex-wrap gap-2">
              {stores.map(store => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleStoreToggle(store.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    formData.storeIds.includes(store.id)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm text-gray-700">Promoción activa</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Promoción'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm" showCloseButton={false}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
            <Trash2 className="text-red-600" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">¿Eliminar Promoción?</h3>
          <p className="mt-2 text-sm text-gray-500">
            <strong>{selectedPromo?.title}</strong>
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
