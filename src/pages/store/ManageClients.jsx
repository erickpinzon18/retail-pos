import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Users2, 
  Star, 
  Search, 
  Eye, 
  Pencil, 
  Trash2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Award,
  TrendingUp,
  Copy,
  CheckCircle,
  ShoppingBag,
  Store,
  PackageOpen,
  Clock,
  Printer
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, create, update, remove, getClientMonthlyTotal, getClientPurchases, getApartados, addApartadoPayment } from '../../api/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

const VIP_THRESHOLD = 2000; // $2000 para ser VIP
const VIP_DISCOUNT = 15; // 15% de descuento

export default function ManageClients() {
  const { user } = useAuth();
  const { storeId, storeName } = useStore();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clientApartados, setClientApartados] = useState([]);
  
  // Inline payment state
  const [payingApartadoId, setPayingApartadoId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });


  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await getAll('clients');
      
      // Load monthly totals from subcollections for each client
      const clientsWithTotals = await Promise.all(
        data.map(async (client) => {
          try {
            const monthlyTotal = await getClientMonthlyTotal(client.id);
            return {
              ...client,
              monthlyPurchases: monthlyTotal,
              isVip: monthlyTotal >= VIP_THRESHOLD
            };
          } catch (error) {
            console.error(`Error getting monthly total for ${client.id}:`, error);
            return { ...client, monthlyPurchases: 0, isVip: false };
          }
        })
      );
      
      setClients(clientsWithTotals);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate unique 5-digit client ID
  const generateClientId = () => {
    const existingIds = clients.map(c => c.clientId);
    let newId;
    do {
      newId = Math.floor(10000 + Math.random() * 90000).toString();
    } while (existingIds.includes(newId));
    return newId;
  };

  // Check if client is VIP based on monthly purchases
  const isVip = (client) => {
    return (client.monthlyPurchases || 0) >= VIP_THRESHOLD;
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    let result = clients;
    
    if (filter === 'vip') {
      result = result.filter(c => c.isVip || isVip(c));
    } else if (filter === 'normal') {
      result = result.filter(c => !c.isVip && !isVip(c));
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.clientId?.includes(term)
      );
    }
    
    return result.sort((a, b) => (b.monthlyPurchases || 0) - (a.monthlyPurchases || 0));
  }, [clients, filter, searchTerm]);

  // Stats - calculated from real subcollection data
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const vipClients = clients.filter(c => c.isVip || isVip(c)).length;
    const totalMonthlyPurchases = clients.reduce((sum, c) => sum + (c.monthlyPurchases || 0), 0);
    const avgPurchases = totalClients > 0 ? totalMonthlyPurchases / totalClients : 0;
    
    return { totalClients, vipClients, totalMonthlyPurchases, avgPurchases };
  }, [clients]);

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', notes: '' });
    setSelectedClient(null);
  };

  const handleAdd = () => {
    setIsEditing(false);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (client) => {
    setIsEditing(true);
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  const handleView = async (client) => {
    setSelectedClient(client);
    setShowDetailModal(true);
    setClientApartados([]);
    
    // Load purchases and apartados
    try {
      const [purchases, monthlyTotal, allApartados] = await Promise.all([
        getClientPurchases(client.id),
        getClientMonthlyTotal(client.id),
        storeId ? getApartados(storeId) : Promise.resolve([])
      ]);
      
      // Filter apartados for this client
      const clientApts = allApartados.filter(a => a.clientId === client.id);
      setClientApartados(clientApts);
      
      // Update selected client with real data
      setSelectedClient(prev => ({
        ...prev,
        purchases: purchases,
        monthlyPurchases: monthlyTotal,
        isVip: monthlyTotal >= VIP_THRESHOLD
      }));
    } catch (error) {
      console.error('Error loading client data:', error);
    }
  };

  // Handle inline apartado payment
  const handleInlinePayment = async (apartadoId) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    
    const apt = clientApartados.find(a => a.id === apartadoId);
    if (!apt) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount > apt.remainingBalance) {
      alert('El monto excede el saldo pendiente');
      return;
    }
    
    try {
      setProcessingPayment(true);
      
      await addApartadoPayment(storeId, apartadoId, {
        amount,
        paymentMethod: 'cash',
        receivedBy: user?.uid,
        receivedByName: user?.name || 'Vendedor'
      });
      
      // Refresh apartados
      const allApartados = await getApartados(storeId);
      const updatedApts = allApartados.filter(a => a.clientId === selectedClient.id);
      setClientApartados(updatedApts);
      
      // Clear payment form
      setPayingApartadoId(null);
      setPaymentAmount('');
      
      // Check if completed
      const updated = updatedApts.find(a => a.id === apartadoId);
      if (updated?.status === 'completed') {
        alert('✅ ¡Apartado liquidado! El cliente puede recoger sus productos.');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error al registrar abono');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Print apartado account statement
  const printApartadoStatement = () => {
    if (!selectedClient || clientApartados.length === 0) return;
    
    const totalPendiente = clientApartados.reduce((sum, a) => sum + (a.remainingBalance || 0), 0);
    const totalAbonado = clientApartados.reduce((sum, a) => sum + (a.depositPaid || 0), 0);
    
    const content = `
      <html>
        <head>
          <title>Estado de Cuenta - ${selectedClient.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; color: #666; margin-top: 0; }
            .client { background: #f5f5f5; padding: 10px; border-radius: 8px; margin: 15px 0; }
            .apartado { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 8px; }
            .apartado-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; }
            .apartado-status { font-size: 12px; color: ${status => status === 'active' ? '#f97316' : '#22c55e'}; }
            .products { font-size: 12px; color: #666; margin: 8px 0; }
            .payments { font-size: 11px; margin-top: 8px; }
            .payment { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 10px; margin: 2px; }
            .balance { display: flex; justify-content: space-between; margin-top: 5px; }
            .total { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${storeName || 'Mi Tienda'}</h1>
          <h2>Estado de Cuenta</h2>
          
          <div class="client">
            <strong>${selectedClient.name}</strong><br>
            <small>#${selectedClient.clientId} • ${selectedClient.phone || 'Sin tel'}</small>
          </div>
          
          ${clientApartados.map(apt => {
            const dueDate = apt.dueDate?.toDate ? apt.dueDate.toDate() : new Date(apt.dueDate);
            return `
              <div class="apartado">
                <div class="apartado-header">
                  <span>${apt.apartadoNumber}</span>
                  <span style="color: ${apt.status === 'completed' ? '#22c55e' : apt.status === 'expired' ? '#ef4444' : '#f97316'}">
                    ${apt.status === 'completed' ? '✓ Completado' : apt.status === 'expired' ? '✗ Vencido' : 'Activo'}
                  </span>
                </div>
                <div class="products">
                  ${apt.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Sin productos'}
                </div>
                <div class="balance">
                  <span>Total: $${apt.total?.toFixed(2)}</span>
                  <span>Pagado: $${apt.depositPaid?.toFixed(2)}</span>
                </div>
                <div class="balance" style="font-weight: bold; color: #f97316;">
                  <span>Restante:</span>
                  <span>$${apt.remainingBalance?.toFixed(2)}</span>
                </div>
                ${apt.status === 'active' ? `<div style="font-size: 11px; color: #666; margin-top: 5px;">Vence: ${dueDate.toLocaleDateString('es-MX')}</div>` : ''}
                ${apt.payments?.length > 0 ? `
                  <div class="payments">
                    Abonos: ${apt.payments.map(p => `<span class="payment">$${p.amount?.toFixed(2)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
          
          <div class="total">
            <div class="total-row">
              <span>Total en Apartados:</span>
              <span>$${clientApartados.reduce((s, a) => s + (a.total || 0), 0).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total Abonado:</span>
              <span style="color: #22c55e;">$${totalAbonado.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-weight: bold; font-size: 16px;">
              <span>SALDO PENDIENTE:</span>
              <span style="color: #f97316;">$${totalPendiente.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            Generado: ${new Date().toLocaleString('es-MX')}<br>
            ¡Gracias por su preferencia!
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDeleteClick = (client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (isEditing && selectedClient) {
        await update('clients', selectedClient.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          notes: formData.notes.trim()
        });
      } else {
        const currentMonth = new Date().toISOString().slice(0, 7);
        await create('clients', {
          clientId: generateClientId(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          notes: formData.notes.trim(),
          monthlyPurchases: 0,
          totalPurchases: 0,
          lastPurchaseMonth: currentMonth,
          createdAt: new Date(),
          registeredBy: user?.uid || null,
          registeredByName: user?.name || 'Desconocido',
          registeredAtStoreId: storeId || null,
          registeredAtStoreName: storeName || 'Desconocida'
        });
      }
      
      await fetchClients();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    
    try {
      setSaving(true);
      await remove('clients', selectedClient.id);
      await fetchClients();
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar cliente');
    } finally {
      setSaving(false);
    }
  };

  const copyClientId = (clientId) => {
    navigator.clipboard.writeText(clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVipProgress = (client) => {
    const purchases = client.monthlyPurchases || 0;
    return Math.min((purchases / VIP_THRESHOLD) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
          <p className="text-gray-500 mt-1">Administra tu cartera de clientes y programa VIP.</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleAdd}>
          Registrar Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Users2 size={18} />
            <span className="text-white/80 text-sm">Total Clientes</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalClients}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Star size={18} />
            <span className="text-white/80 text-sm">Clientes VIP</span>
          </div>
          <p className="text-2xl font-bold">{stats.vipClients}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} />
            <span className="text-white/80 text-sm">Compras del Mes</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyPurchases)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} />
            <span className="text-white/80 text-sm">Promedio/Cliente</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgPurchases)}</p>
        </div>
      </div>

      {/* VIP Info Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4">
        <div className="p-3 bg-yellow-100 rounded-xl">
          <Award size={24} className="text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Programa VIP</h3>
          <p className="text-sm text-gray-600">
            Clientes que acumulen <strong>{formatCurrency(VIP_THRESHOLD)}</strong> en compras al mes obtienen <strong>{VIP_DISCOUNT}% de descuento</strong> en sus siguientes compras. Se reinicia cada mes.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, email o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex space-x-2 p-1 bg-gray-200 rounded-xl w-fit">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'vip', label: '⭐ VIP' },
            { id: 'normal', label: 'Normales' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                filter === id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <Users2 size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No hay clientes registrados</p>
          <Button className="mt-4" onClick={handleAdd}>
            Registrar Primer Cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => {
            const clientIsVip = isVip(client);
            const progress = getVipProgress(client);
            
            return (
              <div 
                key={client.id} 
                className={`bg-white rounded-2xl shadow-md overflow-hidden border-t-4 ${
                  clientIsVip ? 'border-yellow-500' : 'border-indigo-500'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                        clientIsVip 
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                          : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                      }`}>
                        {client.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{client.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">#{client.clientId}</span>
                          {clientIsVip && (
                            <Badge variant="warning" className="ml-1">⭐ VIP</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleView(client)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(client)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(client)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={14} />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>

                  {/* VIP Progress */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-500">Compras del mes</span>
                      <span className={`font-bold ${clientIsVip ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {formatCurrency(client.monthlyPurchases || 0)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          clientIsVip 
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                            : 'bg-gradient-to-r from-indigo-400 to-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-400">{progress.toFixed(0)}%</span>
                      <span className="text-gray-400">Meta: {formatCurrency(VIP_THRESHOLD)}</span>
                    </div>
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
        title={isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
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
              placeholder="Juan Pérez"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="427-123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              placeholder="Notas adicionales..."
            />
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
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detalle del Cliente"
        size="xl"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Client Header */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl ${
                isVip(selectedClient) 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                  : 'bg-gradient-to-br from-indigo-400 to-purple-500'
              }`}>
                {selectedClient.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800">{selectedClient.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {isVip(selectedClient) && <Badge variant="warning">⭐ Cliente VIP</Badge>}
                  <Badge variant="gray">
                    {VIP_DISCOUNT}% descuento activo
                  </Badge>
                </div>
              </div>
            </div>

            {/* Client ID with Barcode */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Número de Cliente</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-mono font-bold text-gray-800 tracking-wider">
                    #{selectedClient.clientId}
                  </span>
                </div>
                <button
                  onClick={() => copyClientId(selectedClient.clientId)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              
              {/* Barcode Visual */}
              <div className="mt-4 bg-white p-3 rounded-lg border-2 border-dashed border-gray-200">
                <div className="flex justify-center gap-0.5">
                  {selectedClient.clientId?.split('').map((digit, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="flex gap-px">
                        {[...Array(parseInt(digit) + 1)].map((_, j) => (
                          <div key={j} className="w-0.5 h-10 bg-black" />
                        ))}
                        <div className="w-1 h-10 bg-transparent" />
                      </div>
                      <span className="text-xs font-mono mt-1">{digit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                  Escanear o dicar al vendedor
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                <p className="font-medium text-gray-800">{selectedClient.phone || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-800 truncate">{selectedClient.email || '-'}</p>
              </div>
            </div>

            {/* Purchase Stats */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3">Estadísticas de Compras</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Compras Este Mes</p>
                  <p className="text-xl font-bold text-indigo-600">{formatCurrency(selectedClient.monthlyPurchases || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Compras Totales</p>
                  <p className="text-xl font-bold text-gray-700">{formatCurrency(selectedClient.totalPurchases || 0)}</p>
                </div>
              </div>
              
              {/* VIP Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Progreso VIP del mes</span>
                  <span className="font-bold text-gray-700">
                    {formatCurrency(selectedClient.monthlyPurchases || 0)} / {formatCurrency(VIP_THRESHOLD)}
                  </span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      isVip(selectedClient)
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                        : 'bg-gradient-to-r from-indigo-400 to-purple-500'
                    }`}
                    style={{ width: `${getVipProgress(selectedClient)}%` }}
                  />
                </div>
                {(selectedClient.monthlyPurchases || 0) >= VIP_THRESHOLD ? (
                  <p className="text-xs text-yellow-600 mt-2 font-medium">
                    ⭐ ¡Cliente VIP! {VIP_DISCOUNT}% de descuento en todas sus compras este mes
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    Faltan {formatCurrency(VIP_THRESHOLD - (selectedClient.monthlyPurchases || 0))} para ser VIP
                  </p>
                )}
              </div>
            </div>

            {/* Purchase History */}
            {selectedClient.purchases && selectedClient.purchases.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <ShoppingBag size={16} />
                  Historial de Compras ({selectedClient.purchases.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedClient.purchases.slice(0, 10).map((purchase, idx) => {
                    const purchaseDate = purchase.createdAt?.toDate ? purchase.createdAt.toDate() : new Date(purchase.createdAt);
                    return (
                      <div key={purchase.id || idx} className="bg-white p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Store size={12} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">{purchase.storeName || 'Tienda'}</span>
                          </div>
                          <span className="font-bold text-green-600">{formatCurrency(purchase.total || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{purchaseDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>{purchase.items?.length || 0} productos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apartados Section */}
            {clientApartados.length > 0 && (
              <div className="bg-orange-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PackageOpen size={18} className="text-orange-600" />
                    <p className="font-bold text-gray-700">Apartados ({clientApartados.length})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={printApartadoStatement}
                      className="p-2 bg-white text-gray-600 rounded-lg hover:bg-gray-100 transition"
                      title="Imprimir estado de cuenta"
                    >
                      <Printer size={16} />
                    </button>
                    <Badge variant="warning">
                      {formatCurrency(clientApartados.reduce((sum, a) => sum + (a.remainingBalance || 0), 0))} pendiente
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {clientApartados.map((apt) => {
                    const dueDate = apt.dueDate?.toDate ? apt.dueDate.toDate() : new Date(apt.dueDate);
                    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                    const progress = apt.total > 0 ? ((apt.depositPaid / apt.total) * 100).toFixed(0) : 0;
                    
                    return (
                      <div key={apt.id} className={`bg-white p-3 rounded-lg border-l-4 ${
                        apt.status === 'completed' ? 'border-green-500' :
                        apt.status === 'expired' ? 'border-red-500' :
                        daysLeft <= 3 ? 'border-red-400' :
                        daysLeft <= 7 ? 'border-yellow-400' : 'border-orange-400'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{apt.apartadoNumber}</span>
                            {apt.status === 'completed' ? (
                              <Badge variant="success">Completado</Badge>
                            ) : apt.status === 'expired' ? (
                              <Badge variant="danger">Vencido</Badge>
                            ) : (
                              <Badge variant={daysLeft <= 3 ? 'danger' : daysLeft <= 7 ? 'warning' : 'info'}>
                                <Clock size={10} className="mr-1" />
                                {daysLeft}d
                              </Badge>
                            )}
                          </div>
                          <span className="font-bold text-orange-600">{formatCurrency(apt.remainingBalance)}</span>
                        </div>
                        
                        {/* Progress bar */}
                        {apt.status === 'active' && (
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Pagado: {formatCurrency(apt.depositPaid)}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Products */}
                        <div className="text-xs text-gray-500">
                          {apt.items?.slice(0, 2).map((item, i) => (
                            <span key={i}>{i > 0 ? ', ' : ''}{item.quantity}x {item.name}</span>
                          ))}
                          {apt.items?.length > 2 && <span> +{apt.items.length - 2} más</span>}
                        </div>
                        
                        {/* Payments history */}
                        {apt.payments?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">Historial de abonos:</p>
                            <div className="flex flex-wrap gap-1">
                              {apt.payments.map((p, idx) => (
                                <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {formatCurrency(p.amount)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Inline payment actions */}
                        {apt.status === 'active' && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {payingApartadoId === apt.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                  max={apt.remainingBalance}
                                  placeholder="Monto..."
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                />
                                <button
                                  onClick={() => handleInlinePayment(apt.id)}
                                  disabled={processingPayment || !paymentAmount}
                                  className="px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                >
                                  {processingPayment ? '...' : 'Abonar'}
                                </button>
                                <button
                                  onClick={() => {
                                    setPayingApartadoId(null);
                                    setPaymentAmount('');
                                  }}
                                  className="px-2 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setPayingApartadoId(apt.id);
                                    setPaymentAmount('');
                                  }}
                                  className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-200 transition"
                                >
                                  + Abonar
                                </button>
                                <button
                                  onClick={() => {
                                    setPayingApartadoId(apt.id);
                                    setPaymentAmount(apt.remainingBalance.toString());
                                  }}
                                  className="flex-1 px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition"
                                >
                                  Liquidar Todo
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedClient.notes && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xs text-yellow-600 mb-1">Notas</p>
                <p className="text-sm text-gray-700">{selectedClient.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => setShowDetailModal(false)}
              >
                Cerrar
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(selectedClient);
                }}
              >
                Editar Cliente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm" showCloseButton={false}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
            <Trash2 className="text-red-600" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">¿Eliminar Cliente?</h3>
          <p className="mt-2 text-sm text-gray-500">
            <strong>{selectedClient?.name}</strong>
            <br />
            Esta acción no se puede deshacer.
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
