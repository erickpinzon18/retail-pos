import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  DollarSign,
  Calendar,
  User,
  Phone,
  FileText,
  ChevronRight,
  Receipt,
  Printer
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { 
  getApartados, 
  addApartadoPayment, 
  completeApartado, 
  cancelApartado,
  checkExpiredApartados
} from '../../api/firestoreService';

export default function ManageApartados() {
  const { storeId, storeName } = useStore();
  const { user } = useAuth();
  
  const [apartados, setApartados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active, completed, cancelled, expired, all
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail modal
  const [selectedApartado, setSelectedApartado] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);

  useEffect(() => {
    if (storeId) {
      fetchApartados();
    }
  }, [storeId]);

  const fetchApartados = async () => {
    try {
      setLoading(true);
      // Check for expired first
      await checkExpiredApartados(storeId);
      
      const data = await getApartados(storeId);
      setApartados(data);
    } catch (error) {
      console.error('Error fetching apartados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApartados = useMemo(() => {
    let result = apartados;
    
    if (filter !== 'all') {
      result = result.filter(a => a.status === filter);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.apartadoNumber?.toLowerCase().includes(term) ||
        a.clientName?.toLowerCase().includes(term) ||
        a.clientClientId?.includes(term)
      );
    }
    
    return result;
  }, [apartados, filter, searchTerm]);

  const stats = useMemo(() => {
    const active = apartados.filter(a => a.status === 'active');
    const completed = apartados.filter(a => a.status === 'completed');
    const expired = apartados.filter(a => a.status === 'expired');
    
    const totalPending = active.reduce((sum, a) => sum + (a.remainingBalance || 0), 0);
    const totalCollected = apartados.reduce((sum, a) => sum + (a.depositPaid || 0), 0);
    
    return {
      active: active.length,
      completed: completed.length,
      expired: expired.length,
      totalPending,
      totalCollected
    };
  }, [apartados]);

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return 0;
    const due = dueDate?.toDate ? dueDate.toDate() : new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (status, dueDate = null) => {
    const days = getDaysRemaining(dueDate);
    
    if (status === 'active') {
      if (days <= 0) return <Badge variant="danger">Vencido</Badge>;
      if (days <= 3) return <Badge variant="warning">Vence en {days}d</Badge>;
      if (days <= 7) return <Badge variant="info">{days} días</Badge>;
      return <Badge variant="success">{days} días</Badge>;
    }
    
    const badges = {
      completed: <Badge variant="success">Completado</Badge>,
      cancelled: <Badge variant="secondary">Cancelado</Badge>,
      expired: <Badge variant="danger">Vencido</Badge>
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  const handleViewDetail = (apartado) => {
    setSelectedApartado(apartado);
    setShowDetailModal(true);
  };

  const handleOpenPayment = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  const handleAddPayment = async () => {
    if (!selectedApartado || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedApartado.remainingBalance) {
      alert('Monto inválido');
      return;
    }
    
    try {
      setProcessingPayment(true);
      
      await addApartadoPayment(storeId, selectedApartado.id, {
        amount,
        paymentMethod,
        receivedBy: user?.uid,
        receivedByName: user?.name || 'Vendedor'
      });
      
      await fetchApartados();
      setShowPaymentModal(false);
      
      // Update selected apartado
      const updated = await getApartados(storeId);
      const refreshed = updated.find(a => a.id === selectedApartado.id);
      if (refreshed) {
        setSelectedApartado(refreshed);
        if (refreshed.status === 'completed') {
          alert('✅ ¡Apartado pagado completamente! El cliente puede recoger sus productos.');
        }
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error al registrar abono');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelApartado = async () => {
    if (!selectedApartado) return;
    
    try {
      setProcessingCancel(true);
      await cancelApartado(storeId, selectedApartado.id, cancelReason);
      await fetchApartados();
      setShowCancelModal(false);
      setShowDetailModal(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling apartado:', error);
      alert('Error al cancelar apartado');
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedApartado) return;
    
    if (selectedApartado.remainingBalance > 0) {
      alert('El apartado aún tiene saldo pendiente');
      return;
    }
    
    try {
      await completeApartado(storeId, selectedApartado.id);
      await fetchApartados();
      setShowDetailModal(false);
      alert('✅ Apartado marcado como entregado');
    } catch (error) {
      console.error('Error completing apartado:', error);
    }
  };

  // Print individual apartado statement
  const printApartadoStatement = (apt) => {
    if (!apt) return;
    
    const dueDate = apt.dueDate?.toDate ? apt.dueDate.toDate() : new Date(apt.dueDate);
    
    const content = `
      <html>
        <head>
          <title>Estado de Cuenta - ${apt.apartadoNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; color: #666; margin-top: 0; }
            .header { background: #fff7ed; padding: 10px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .header h3 { margin: 0; color: #f97316; }
            .client { background: #f5f5f5; padding: 10px; border-radius: 8px; margin: 10px 0; }
            .products { margin: 15px 0; }
            .product { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ddd; }
            .payments { margin: 15px 0; }
            .payment { display: inline-block; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 10px; margin: 2px; font-size: 12px; }
            .total { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; }
            .status { text-align: center; padding: 10px; border-radius: 8px; margin: 10px 0; }
            .status.active { background: #fff7ed; color: #f97316; }
            .status.completed { background: #dcfce7; color: #166534; }
          </style>
        </head>
        <body>
          <h1>${storeName || 'Mi Tienda'}</h1>
          <h2>Estado de Cuenta Apartado</h2>
          
          <div class="header">
            <h3>${apt.apartadoNumber}</h3>
            <small>Vence: ${dueDate.toLocaleDateString('es-MX')}</small>
          </div>
          
          <div class="status ${apt.status}">
            ${apt.status === 'completed' ? '✓ COMPLETADO' : apt.status === 'expired' ? '✗ VENCIDO' : 'ACTIVO'}
          </div>
          
          <div class="client">
            <strong>${apt.clientName}</strong><br>
            <small>#${apt.clientClientId} ${apt.clientPhone ? '• ' + apt.clientPhone : ''}</small>
          </div>
          
          <div class="products">
            <strong>Productos:</strong>
            ${apt.items?.map(i => `<div class="product"><span>${i.quantity}x ${i.name}</span><span>\$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('') || ''}
          </div>
          
          ${apt.payments?.length > 0 ? `
            <div class="payments">
              <strong>Abonos realizados:</strong><br>
              ${apt.payments.map(p => `<span class="payment">\$${p.amount?.toFixed(2)}</span>`).join('')}
            </div>
          ` : ''}
          
          <div class="total">
            <div class="total-row">
              <span>Total Apartado:</span>
              <span>\$${apt.total?.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total Abonado:</span>
              <span style="color: #22c55e;">\$${apt.depositPaid?.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-weight: bold; font-size: 18px;">
              <span>SALDO PENDIENTE:</span>
              <span style="color: #f97316;">\$${apt.remainingBalance?.toFixed(2)}</span>
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

  // Quick liquidation
  const handleQuickLiquidate = () => {
    if (!selectedApartado) return;
    setPaymentAmount(selectedApartado.remainingBalance.toString());
    setShowPaymentModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando apartados...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Package className="text-orange-500" />
            Apartados
          </h1>
          <p className="text-gray-500 mt-1">Gestiona los apartados de {storeName}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl text-white">
          <Clock size={20} className="mb-2 opacity-80" />
          <p className="text-white/70 text-sm">Activos</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl text-white">
          <CheckCircle size={20} className="mb-2 opacity-80" />
          <p className="text-white/70 text-sm">Completados</p>
          <p className="text-2xl font-bold">{stats.completed}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 rounded-2xl text-white">
          <AlertTriangle size={20} className="mb-2 opacity-80" />
          <p className="text-white/70 text-sm">Vencidos</p>
          <p className="text-2xl font-bold">{stats.expired}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white">
          <DollarSign size={20} className="mb-2 opacity-80" />
          <p className="text-white/70 text-sm">Cobrado</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalCollected)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl text-white">
          <Receipt size={20} className="mb-2 opacity-80" />
          <p className="text-white/70 text-sm">Por Cobrar</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número, cliente..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'active', label: 'Activos', icon: Clock },
            { value: 'completed', label: 'Completados', icon: CheckCircle },
            { value: 'expired', label: 'Vencidos', icon: AlertTriangle },
            { value: 'all', label: 'Todos', icon: Filter }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
                filter === f.value 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <f.icon size={16} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apartados List */}
      {filteredApartados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No hay apartados {filter !== 'all' ? filter : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApartados.map(apartado => {
            const days = getDaysRemaining(apartado.dueDate);
            const progress = apartado.total > 0 
              ? ((apartado.depositPaid / apartado.total) * 100).toFixed(0) 
              : 0;
            
            return (
              <div 
                key={apartado.id}
                onClick={() => handleViewDetail(apartado)}
                className={`bg-white rounded-2xl shadow-md p-5 cursor-pointer hover:shadow-lg transition border-l-4 ${
                  apartado.status === 'active' && days <= 3 ? 'border-red-500' :
                  apartado.status === 'active' && days <= 7 ? 'border-yellow-500' :
                  apartado.status === 'active' ? 'border-green-500' :
                  apartado.status === 'completed' ? 'border-emerald-500' :
                  'border-gray-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{apartado.apartadoNumber}</p>
                    <p className="text-xs text-gray-400">
                      {apartado.createdAt?.toDate 
                        ? apartado.createdAt.toDate().toLocaleDateString('es-MX') 
                        : 'Sin fecha'}
                    </p>
                  </div>
                  {getStatusBadge(apartado.status, apartado.dueDate)}
                </div>

                {/* Client */}
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">{apartado.clientName}</p>
                    <p className="text-xs text-gray-400">#{apartado.clientClientId}</p>
                  </div>
                </div>

                {/* Products Preview */}
                <p className="text-xs text-gray-500 mb-3">
                  {apartado.items?.length || 0} producto(s)
                </p>

                {/* Progress Bar */}
                {apartado.status === 'active' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Pagado: {formatCurrency(apartado.depositPaid)}</span>
                      <span className="text-orange-600 font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Restante</p>
                    <p className="font-bold text-orange-600">{formatCurrency(apartado.remainingBalance)}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Apartado ${selectedApartado?.apartadoNumber || ''}`}
        size="lg"
      >
        {selectedApartado && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className={`p-4 rounded-xl ${
              selectedApartado.status === 'active' ? 'bg-orange-50 border border-orange-200' :
              selectedApartado.status === 'completed' ? 'bg-green-50 border border-green-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedApartado.status === 'active' ? <Clock className="text-orange-500" /> :
                   selectedApartado.status === 'completed' ? <CheckCircle className="text-green-500" /> :
                   <XCircle className="text-gray-500" />}
                  <div>
                    <p className="font-bold text-gray-800">
                      {selectedApartado.status === 'active' ? 'Apartado Activo' :
                       selectedApartado.status === 'completed' ? 'Completado' :
                       selectedApartado.status === 'expired' ? 'Vencido' : 'Cancelado'}
                    </p>
                    {selectedApartado.status === 'active' && (
                      <p className="text-sm text-gray-500">
                        Vence: {selectedApartado.dueDate?.toDate 
                          ? selectedApartado.dueDate.toDate().toLocaleDateString('es-MX') 
                          : 'N/A'} ({getDaysRemaining(selectedApartado.dueDate)} días)
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(selectedApartado.status, selectedApartado.dueDate)}
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <User size={16} /> Cliente
              </h4>
              <p className="font-medium">{selectedApartado.clientName}</p>
              <p className="text-sm text-gray-500">#{selectedApartado.clientClientId}</p>
              {selectedApartado.clientPhone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone size={12} /> {selectedApartado.clientPhone}
                </p>
              )}
            </div>

            {/* Products */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Package size={16} /> Productos
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedApartado.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.quantity}x {item.name}</span>
                    <span className="font-medium">{formatCurrency(item.finalPrice || item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold pt-2 mt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(selectedApartado.total)}</span>
              </div>
            </div>

            {/* Payments History */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign size={16} /> Historial de Abonos
              </h4>
              {selectedApartado.payments?.length === 0 ? (
                <p className="text-sm text-gray-400">Sin abonos registrados</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedApartado.payments?.map((payment, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded-lg">
                      <div>
                        <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                        <span className="text-gray-400 ml-2">
                          {payment.date?.toDate 
                            ? payment.date.toDate().toLocaleDateString('es-MX') 
                            : ''}
                        </span>
                      </div>
                      <span className="text-gray-500 text-xs">{payment.receivedByName}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Pagado</p>
                  <p className="font-bold text-green-600">{formatCurrency(selectedApartado.depositPaid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Restante</p>
                  <p className="font-bold text-orange-600">{formatCurrency(selectedApartado.remainingBalance)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedApartado.notes && (
              <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={14} /> Notas:
                </p>
                <p className="text-sm text-gray-600 mt-1">{selectedApartado.notes}</p>
              </div>
            )}

            {/* Actions */}
            {selectedApartado.status === 'active' && (
              <div className="space-y-3 pt-2">
                {/* Print button row */}
                <button
                  onClick={() => printApartadoStatement(selectedApartado)}
                  className="w-full py-2 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Imprimir Estado de Cuenta
                </button>
                
                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 py-3 px-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition"
                  >
                    Cancelar
                  </button>
                  {selectedApartado.remainingBalance > 0 ? (
                    <>
                      <button
                        onClick={handleOpenPayment}
                        className="flex-1 py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Abonar
                      </button>
                      <button
                        onClick={handleQuickLiquidate}
                        className="flex-1 py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
                      >
                        Liquidar Todo
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleComplete}
                      className="flex-1 py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} /> Marcar Entregado
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Registrar Abono"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-sm text-gray-500">Balance pendiente:</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(selectedApartado?.remainingBalance || 0)}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto del abono</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={selectedApartado?.remainingBalance || 0}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-lg font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddPayment}
              disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="flex-1 py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
            >
              {processingPayment ? 'Guardando...' : 'Registrar Abono'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Apartado"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <p className="text-sm text-red-700">
              ¿Estás seguro de cancelar este apartado? Esta acción no se puede deshacer.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón (opcional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Ej: Cliente no pudo completar pago..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
            >
              Volver
            </button>
            <button
              onClick={handleCancelApartado}
              disabled={processingCancel}
              className="flex-1 py-3 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition disabled:opacity-50"
            >
              {processingCancel ? 'Cancelando...' : 'Sí, Cancelar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
