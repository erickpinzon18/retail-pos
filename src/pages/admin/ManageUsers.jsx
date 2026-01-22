import { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Search,
  Store,
  Calendar,
  DollarSign,
  ShoppingBag,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, create, update, remove, getSalesByDateRange } from '../../api/firestoreService';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    pin: '',
    storeId: '',
    role: 'cashier',
    type: 'weekday',
    status: true // true = active, false = disabled
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, storesData] = await Promise.all([
        getAll('users'),
        getAll('stores')
      ]);
      setUsers(usersData);
      setStores(storesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (storeId, role) => {
    if (role === 'admin') return 'Todas las tiendas';
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Sin asignar';
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      pin: '',
      storeId: stores[0]?.id || '',
      role: 'cashier',
      type: 'weekday',
      status: true
    });
    setSelectedUser(null);
  };

  const handleAddUser = () => {
    setIsEditing(false);
    resetForm();
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't show existing password
      pin: user.pin || '',
      storeId: user.storeId || '',
      role: user.role || 'cashier',
      type: user.type || 'weekday',
      status: user.status !== false // Default to true if undefined
    });
    setShowUserModal(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleViewStats = async (user) => {
    setSelectedUser(user);
    setUserStats(null);
    setShowStatsModal(true);
    
    try {
      // Get sales for this user in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (user.storeId) {
        const sales = await getSalesByDateRange(user.storeId, thirtyDaysAgo, new Date());
        const userSales = sales.filter(s => s.userId === user.id || s.userName === user.name);
        
        const totalSales = userSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const transactions = userSales.length;
        
        setUserStats({
          sales: totalSales,
          transactions,
          avgTicket: transactions > 0 ? totalSales / transactions : 0
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        pin: formData.pin,
        storeId: formData.storeId,
        role: formData.role,
        type: formData.type,
        status: formData.status
      };
      
      if (isEditing && selectedUser) {
        // Update existing user (Firestore only)
        // Note: Password update not supported here for security (should use auth reset)
        delete userData.password; // Remove password from data to update
        await update('users', selectedUser.id, userData);
      } else {
        // Create new user via Cloud Function
        if (!formData.password || formData.password.length < 6) {
          alert('La contraseña debe tener al menos 6 caracteres');
          return;
        }

        const functions = getFunctions();
        const createUser = httpsCallable(functions, 'createUser');
        
        await createUser({
          ...userData,
          password: formData.password
        });
      }

      
      await fetchData();
      setShowUserModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    try {
      setSaving(true);
      await remove('users', selectedUser.id);
      await fetchData();
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      setSaving(true);
      const newStatus = !user.status; // Toggle status
      // If undefined, assume true, so new is false
      if (user.status === undefined) newStatus === false; 
      
      await update('users', user.id, { status: user.status === false ? true : false });
      await fetchData();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error al actualizar estado');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStore = filterStore === 'all' || user.storeId === filterStore;
    return matchesSearch && matchesStore;
  });

  // Group users by store
  const usersByStore = {};
  filteredUsers.forEach(user => {
    const storeName = getStoreName(user.storeId, user.role);
    if (!usersByStore[storeName]) {
      usersByStore[storeName] = [];
    }
    usersByStore[storeName].push(user);
  });

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: 'Admin', variant: 'purple' },
      manager: { label: 'Gerente', variant: 'info' },
      seller: { label: 'Vendedor', variant: 'success' },
      cashier: { label: 'Cajero', variant: 'success' }
    };
    const r = roles[role] || { label: role, variant: 'gray' };
    return <Badge variant={r.variant}>{r.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    return type === 'weekend' 
      ? <Badge variant="warning">Fin de Semana</Badge>
      : <Badge variant="info">Entre Semana</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">{users.length} usuarios registrados</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleAddUser}>
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Users size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-800">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <Users size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vendedores</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter(u => u.role === 'seller' || u.role === 'cashier').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Entre Semana</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter(u => u.type === 'weekday').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Calendar size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Fin de Semana</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter(u => u.type === 'weekend').length}
              </p>
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
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todas las tiendas</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
      </div>

      {/* Users by Store */}
      {Object.keys(usersByStore).length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(usersByStore).map(([storeName, storeUsers]) => (
            <div key={storeName} className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center gap-3">
                <Store size={20} className="text-white" />
                <h2 className="font-bold text-white">{storeName}</h2>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {storeUsers.length} usuarios
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {storeUsers.map((user) => (
                  <div key={user.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 md:hidden">
                         <div className="flex gap-2 justify-end">
                            {getRoleBadge(user.role)}
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:block">
                        <p className="font-bold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email || 'Sin email'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto mt-2 md:mt-0 gap-4">
                      <div className="hidden md:flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        {getTypeBadge(user.type)}
                        {user.status === false && <Badge variant="danger">Deshabilitado</Badge>}
                      </div>
                      <div className="md:hidden flex flex-wrap gap-2">
                         {getTypeBadge(user.type)}
                         {user.status === false && <Badge variant="danger">Deshabilitado</Badge>}
                      </div>

                      <div className="flex items-center gap-1 ml-auto">
                        <button 
                          onClick={() => handleViewStats(user)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 rounded-lg transition ${
                            user.status === false 
                              ? 'text-red-400 hover:text-green-600 hover:bg-green-50' 
                              : 'text-green-600 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={user.status === false ? "Habilitar Usuario" : "Deshabilitar Usuario"}
                          disabled={saving}
                        >
                          {user.status === false ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              placeholder="Nombre del usuario"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              placeholder="email@ejemplo.com"
            />
          </div>
          
          {!isEditing && (
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="Mínimo 6 caracteres"
                required={!isEditing}
                minLength={6}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN de Acceso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                required
                maxLength={6}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="4-6 dígitos"
              /> */}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tienda</label>
              <select
                value={formData.storeId}
                onChange={(e) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sin asignar</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="seller">Vendedor</option>
                {/* <option value="manager">Gerente</option> */}
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="week">Entre Semana</option>
                <option value="weekend">Fin de Semana</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setShowUserModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* User Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title={`Estadísticas de ${selectedUser?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
              {selectedUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-lg">{selectedUser?.name}</p>
              <p className="text-sm text-gray-500">{getStoreName(selectedUser?.storeId, selectedUser?.role)}</p>
              <div className="flex gap-2 mt-1">
                {selectedUser && getRoleBadge(selectedUser.role)}
                {selectedUser && getTypeBadge(selectedUser.type)}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 font-medium">Últimos 30 días</p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <DollarSign size={24} className="mx-auto text-green-600 mb-2" />
              <p className="text-xs text-green-600 font-medium">Ventas</p>
              <p className="text-lg font-bold text-green-700">
                {userStats ? formatCurrency(userStats.sales) : '...'}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <ShoppingBag size={24} className="mx-auto text-blue-600 mb-2" />
              <p className="text-xs text-blue-600 font-medium">Transacciones</p>
              <p className="text-lg font-bold text-blue-700">
                {userStats ? userStats.transactions : '...'}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl text-center">
              <DollarSign size={24} className="mx-auto text-purple-600 mb-2" />
              <p className="text-xs text-purple-600 font-medium">Ticket Prom.</p>
              <p className="text-lg font-bold text-purple-700">
                {userStats ? formatCurrency(userStats.avgTicket) : '...'}
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm" showCloseButton={false}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
            <Trash2 className="text-red-600" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">¿Eliminar Usuario?</h3>
          <p className="mt-2 text-sm text-gray-500">
            <strong>{selectedUser?.name}</strong>
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
