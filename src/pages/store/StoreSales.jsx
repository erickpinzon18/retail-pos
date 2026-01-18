import { useState, useEffect, useMemo } from 'react';
import { Eye, Printer, RotateCcw, Calendar, DollarSign, ShoppingBag, TrendingUp, Clock, AlertTriangle, CheckCircle, X, PackageOpen } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PinModal from '../../components/shared/PinModal';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatTime } from '../../utils/dateUtils';
import { printSaleTicket } from '../../utils/printTicket';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { getSalesByStore, getById, getTodayCashCloses, addCashClose } from '../../api/firestoreService';

// Scheduled cash close times
const SCHEDULED_CLOSES = [
  { id: 'morning', name: 'Corte Mañana', hour: 12, label: '12:00 PM' },
  { id: 'afternoon', name: 'Corte Tarde', hour: 16, label: '4:00 PM' },
  { id: 'evening', name: 'Corte Noche', hour: 20, label: '8:00 PM' },
];

const CASH_LIMIT = 2000;

export default function StoreSales() {
  const { storeId, storeName } = useStore();
  const { user } = useAuth();
  
  const [sales, setSales] = useState([]);
  const [cashCloses, setCashCloses] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showCashCloseModal, setShowCashCloseModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedCloseType, setSelectedCloseType] = useState(null);
  const [cashCounted, setCashCounted] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!storeId) return;
      
      try {
        setLoading(true);
        const [salesData, storeData, cashCloseData] = await Promise.all([
          getSalesByStore(storeId),
          getById('stores', storeId),
          getTodayCashCloses(storeId)
        ]);
        
        // Filter today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = salesData.filter(sale => {
          const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
          return saleDate >= today;
        });
        
        setSales(todaySales);
        setStoreConfig(storeData);
        setCashCloses(cashCloseData || []);
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [storeId]);

  // Calculate stats
  const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalTransactions = sales.length;
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  // Apartado stats
  const apartadoSales = sales.filter(s => s.type?.startsWith('apartado_'));
  const apartadoTotal = apartadoSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const regularSales = sales.filter(s => !s.type?.startsWith('apartado_'));

  // Payment method breakdown
  const paymentBreakdown = sales.reduce((acc, sale) => {
    const method = sale.paymentMethod || 'cash';
    acc[method] = (acc[method] || 0) + (sale.total || 0);
    return acc;
  }, {});

  // Calculate current cash in register (minus already closed amounts)
  const closedCashAmount = cashCloses.reduce((sum, close) => sum + (close.cashAmount || 0), 0);
  const currentCashInRegister = (paymentBreakdown.cash || 0) - closedCashAmount;

  const paymentMethods = [
    { method: 'Efectivo', key: 'cash', amount: paymentBreakdown.cash || 0 },
    { method: 'Tarjeta', key: 'card', amount: paymentBreakdown.card || 0 },
    { method: 'Transferencia', key: 'transfer', amount: paymentBreakdown.transfer || 0 },
  ].map(pm => ({
    ...pm,
    percentage: totalSales > 0 ? (pm.amount / totalSales) * 100 : 0
  }));

  // Top products
  const productCounts = {};
  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const name = item.name || 'Producto';
      productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
    });
  });
  
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, sold]) => ({ name, sold }));

  // Determine pending cash closes (30 min grace period)
  const pendingCloses = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const completedTypes = cashCloses.map(c => c.closeType);
    
    return SCHEDULED_CLOSES.filter(schedule => {
      const scheduledMinutes = schedule.hour * 60;
      const gracePeriodEnd = scheduledMinutes + 30; // 30 min después de la hora
      return currentMinutes >= gracePeriodEnd && !completedTypes.includes(schedule.id);
    });
  }, [cashCloses]);

  // Check if cash limit is exceeded
  const cashLimitExceeded = currentCashInRegister >= CASH_LIMIT;

  const handleViewTicket = (sale) => {
    setSelectedSale(sale);
    setShowTicketModal(true);
  };

  const handlePrintTicket = (sale) => {
    printSaleTicket(sale, storeConfig);
  };

  const handleReturn = () => {
    setShowPinModal(true);
  };

  const handlePinConfirm = (pin) => {
    setShowPinModal(false);
    alert('Devolución autorizada con PIN: ' + pin);
    setShowTicketModal(false);
  };

  const openCashCloseModal = (closeType = null) => {
    setSelectedCloseType(closeType);
    setCashCounted('');
    setCloseNotes('');
    setShowCashCloseModal(true);
  };

  const handleCashClose = async () => {
    try {
      const cashAmount = parseFloat(cashCounted) || 0;
      
      // Determine close label
      let closeLabel = 'Corte Manual';
      if (selectedCloseType === 'limit') {
        closeLabel = 'Límite de Caja';
      } else if (selectedCloseType) {
        const scheduled = SCHEDULED_CLOSES.find(s => s.id === selectedCloseType);
        closeLabel = scheduled?.name || 'Corte Manual';
      }
      
      const closeData = {
        userId: user?.uid || '',
        userName: user?.name || 'Cajero',
        closeType: selectedCloseType || 'manual',
        closeLabel,
        expectedAmount: currentCashInRegister,
        cashAmount,
        difference: Math.round((cashAmount - currentCashInRegister) * 100) / 100, // Evita floating point
        notes: closeNotes || '',
        salesCount: sales.length,
        totalSales: totalSales || 0
      };
      
      const newEntry = await addCashClose(storeId, closeData);
      
      // Update local state
      setCashCloses(prev => [...prev, newEntry]);
      
      setShowCashCloseModal(false);
      // alert('Cierre de caja registrado exitosamente');
    } catch (error) {
      console.error('Error saving cash close:', error);
      alert('Error al guardar el cierre de caja');
    }
  };

  const dismissAlert = (id) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  const getPaymentBadge = (method) => {
    const variants = { cash: 'success', card: 'primary', transfer: 'warning' };
    const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
    return <Badge variant={variants[method] || 'gray'}>{labels[method] || method}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Pending Close Alerts */}
      {pendingCloses.filter(p => !dismissedAlerts.includes(p.id)).length > 0 && (
        <div className="space-y-2">
          {pendingCloses.filter(p => !dismissedAlerts.includes(p.id)).map(pending => (
            <div key={pending.id} className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={24} />
                <div>
                  <p className="font-semibold text-yellow-800">
                    ¡Corte de caja pendiente!
                  </p>
                  <p className="text-sm text-yellow-700">
                    El corte de las {pending.label} ({pending.name}) no se ha realizado
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => openCashCloseModal(pending.id)}>
                  Realizar Corte
                </Button>
                <button 
                  onClick={() => dismissAlert(pending.id)}
                  className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cash Limit Alert */}
      {cashLimitExceeded && !dismissedAlerts.includes('cashLimit') && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="text-red-600" size={24} />
            <div>
              <p className="font-semibold text-red-800">
                ¡Límite de efectivo alcanzado!
              </p>
              <p className="text-sm text-red-700">
                Hay {formatCurrency(currentCashInRegister)} en caja (límite: {formatCurrency(CASH_LIMIT)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" onClick={() => openCashCloseModal('limit')}>
              Realizar Corte
            </Button>
            <button 
              onClick={() => dismissAlert('cashLimit')}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ventas del Día</h1>
          <p className="text-gray-500 mt-1">
            <Calendar size={14} className="inline mr-1" />
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => openCashCloseModal()}>Realizar Cierre de Caja</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ShoppingBag size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Transacciones</p>
              <p className="text-2xl font-bold text-gray-800">{totalTransactions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(averageTicket)}</p>
            </div>
          </div>
        </div>
        <div className={`p-5 rounded-xl shadow-md ${cashLimitExceeded ? 'bg-red-50 border-2 border-red-300' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${cashLimitExceeded ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <DollarSign size={24} className={cashLimitExceeded ? 'text-red-600' : 'text-yellow-600'} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Efectivo en Caja</p>
              <p className={`text-2xl font-bold ${cashLimitExceeded ? 'text-red-600' : 'text-gray-800'}`}>
                {formatCurrency(currentCashInRegister)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Historial de Transacciones</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando ventas...</div>
            ) : sales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ShoppingBag size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No hay ventas registradas hoy</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Cajero</th>
                      <th className="px-4 py-3">Artículos</th>
                      <th className="px-4 py-3">Pago</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 10).map((sale) => {
                      const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                      const itemCount = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
                      
                      return (
                        <tr key={sale.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600">{formatTime(saleDate)}</td>
                          <td className="px-4 py-3">{sale.userName || 'Cajero'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="gray">{itemCount} items</Badge>
                              {sale.type?.startsWith('apartado_') && (
                                <Badge variant="warning" className="flex items-center gap-1">
                                  <PackageOpen size={12} />
                                  {sale.type === 'apartado_deposit' ? 'Anticipo' : 
                                   sale.type === 'apartado_complete' ? 'Liquidación' : 'Abono'}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">{getPaymentBadge(sale.paymentMethod)}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{formatCurrency(sale.total || 0)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleViewTicket(sale)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                              <Eye size={16} />
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cash Close History */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Historial de Cierres de Caja</h2>
            </div>
            
            {cashCloses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Clock size={40} className="mx-auto mb-2 text-gray-300" />
                <p>No hay cierres de caja hoy</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cashCloses.map((close, idx) => {
                  const closeDate = close.createdAt?.toDate ? close.createdAt.toDate() : new Date(close.createdAt);
                  const hasDifference = Math.abs(close.difference || 0) >= 0.01; // Tolerancia de 1 centavo
                  
                  return (
                    <div key={close.id || idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${hasDifference ? 'bg-red-100' : 'bg-green-100'}`}>
                          {hasDifference 
                            ? <AlertTriangle size={20} className="text-red-600" />
                            : <CheckCircle size={20} className="text-green-600" />
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{close.closeLabel || 'Corte Manual'}</p>
                          <p className="text-xs text-gray-500">
                            {formatTime(closeDate)} - {close.userName || 'Cajero'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{formatCurrency(close.cashAmount || 0)}</p>
                        {hasDifference && (
                          <p className={`text-xs ${close.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Dif: {close.difference > 0 ? '+' : ''}{formatCurrency(close.difference)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Scheduled Closes */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Cortes Programados</h3>
            <div className="space-y-3">
              {SCHEDULED_CLOSES.map(schedule => {
                const isCompleted = cashCloses.some(c => c.closeType === schedule.id);
                const isPending = new Date().getHours() >= schedule.hour && !isCompleted;
                
                return (
                  <div 
                    key={schedule.id}
                    className={`p-3 rounded-xl flex items-center justify-between ${
                      isCompleted ? 'bg-green-50' : isPending ? 'bg-yellow-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={16} className={
                        isCompleted ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-gray-400'
                      } />
                      <div>
                        <p className="font-medium text-sm">{schedule.name}</p>
                        <p className="text-xs text-gray-500">{schedule.label}</p>
                      </div>
                    </div>
                    {isCompleted ? (
                      <Badge variant="success">Completado</Badge>
                    ) : isPending ? (
                      <Button size="sm" onClick={() => openCashCloseModal(schedule.id)}>
                        Realizar
                      </Button>
                    ) : (
                      <Badge variant="gray">Pendiente</Badge>
                    )}
                  </div>
                );
              })}
              
              {/* Cash Limit Close */}
              <div className={`p-3 rounded-xl flex items-center justify-between ${
                cashLimitExceeded ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className={cashLimitExceeded ? 'text-red-600' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-sm">Límite de Caja</p>
                    <p className="text-xs text-gray-500">{formatCurrency(CASH_LIMIT)} máximo</p>
                  </div>
                </div>
                {cashLimitExceeded ? (
                  <Button size="sm" variant="danger" onClick={() => openCashCloseModal('limit')}>
                    Realizar
                  </Button>
                ) : (
                  <Badge variant="gray">{formatCurrency(currentCashInRegister)}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Productos Más Vendidos</h3>
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos todavía</p>
            ) : (
              <ul className="space-y-3">
                {topProducts.map((product, idx) => (
                  <li key={product.name} className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">
                      <span className="font-bold text-gray-800 mr-1">{idx + 1}.</span>
                      {product.name.length > 18 ? product.name.substring(0, 18) + '...' : product.name}
                    </span>
                    <Badge variant="primary">{product.sold}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Por Método de Pago</h3>
            <div className="space-y-4">
              {paymentMethods.map((pm) => (
                <div key={pm.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{pm.method}</span>
                    <span className="font-semibold">{formatCurrency(pm.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        pm.key === 'cash' ? 'bg-green-500' :
                        pm.key === 'card' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${pm.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title="Detalle de Venta"
        size="md"
      >
        {selectedSale && (
          <div>
            <div className="bg-gray-50 p-4 rounded-xl font-mono text-sm space-y-2 mb-4">
              <p className="text-center font-bold text-lg">{storeName || 'Mi Tienda'}</p>
              {storeConfig?.address && (
                <p className="text-center text-xs text-gray-500">{storeConfig.address}</p>
              )}
              <hr className="border-dashed border-gray-300" />
              <div className="flex justify-between text-gray-600">
                <span>Ticket:</span>
                <span>{selectedSale.id}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Cajero:</span>
                <span>{selectedSale.userName || 'Cajero'}</span>
              </div>
              <hr className="border-dashed border-gray-300" />
              
              {(selectedSale.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.finalPrice || item.price * item.quantity)}</span>
                </div>
              ))}
              
              <hr className="border-dashed border-gray-300" />
              
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                className="flex-1" 
                icon={<Printer size={18} />}
                onClick={() => handlePrintTicket(selectedSale)}
              >
                Reimprimir
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                icon={<RotateCcw size={18} />}
                onClick={handleReturn}
              >
                Devolución
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cash Close Modal */}
      <Modal
        isOpen={showCashCloseModal}
        onClose={() => setShowCashCloseModal(false)}
        title={selectedCloseType 
          ? SCHEDULED_CLOSES.find(s => s.id === selectedCloseType)?.name || 'Cierre de Caja'
          : 'Cierre de Caja'
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-sm text-green-700">Efectivo</p>
              <p className="text-xl font-bold text-green-800">{formatCurrency(paymentBreakdown.cash || 0)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-sm text-blue-700">Tarjeta</p>
              <p className="text-xl font-bold text-blue-800">{formatCurrency(paymentBreakdown.card || 0)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="text-sm text-yellow-700">Transferencia</p>
              <p className="text-xl font-bold text-yellow-800">{formatCurrency(paymentBreakdown.transfer || 0)}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-xl text-white text-center">
            <p className="text-sm opacity-80">Efectivo Esperado en Caja</p>
            <p className="text-3xl font-bold">{formatCurrency(currentCashInRegister)}</p>
            {closedCashAmount > 0 && (
              <p className="text-xs opacity-70 mt-1">
                (Ya retirado: {formatCurrency(closedCashAmount)})
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Contado en Caja
            </label>
            <input
              type="number"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              placeholder="$0.00"
              className="w-full border border-gray-200 rounded-xl py-3 px-4 text-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          {cashCounted && (() => {
            const difference = parseFloat(cashCounted || 0) - currentCashInRegister;
            const isMatch = Math.abs(difference) < 0.01; // Tolerancia de 1 centavo
            return (
              <div className={`p-4 rounded-xl text-center ${
                isMatch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <p className="text-sm">Diferencia</p>
                <p className="text-2xl font-bold">
                  {isMatch ? '$0.00' : formatCurrency(difference)}
                </p>
              </div>
            );
          })()}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas Adicionales</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500"
              rows="2"
              placeholder="Observaciones del turno..."
            />
          </div>
          
          <Button className="w-full" size="lg" onClick={handleCashClose}>
            Confirmar Cierre de Caja
          </Button>
        </div>
      </Modal>

      {/* PIN Modal for Returns */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={handlePinConfirm}
        title="Autorización Requerida"
      />
    </div>
  );
}
