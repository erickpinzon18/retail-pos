import { getSalesByStore, getById, getTodayCashCloses, addCashClose, validateAndUseToken, processReturn } from '../../api/firestoreService';
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
import { useState, useEffect } from 'react';

// Cash limit for triggering corte
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
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [returnToken, setReturnToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [showCorteConfirmation, setShowCorteConfirmation] = useState(false);
  const [lastCorteData, setLastCorteData] = useState(null);
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

  // Calculate stats - Filter out returned sales or count them negatively
  const activeSales = sales.filter(s => s.status !== 'returned');
  const totalSales = activeSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalTransactions = activeSales.length;
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

  // Calculate card commission (4% on card sales)
  const totalCardCommission = sales.reduce((sum, sale) => sum + (sale.cardCommission || 0), 0);
  
  // Net sales = total sales - card commission
  const netSales = totalSales - totalCardCommission;

  // Calculate current cash in register - only count sales AFTER last corte
  const lastCorte = cashCloses.length > 0 
    ? cashCloses.reduce((latest, close) => {
        const closeDate = close.createdAt?.toDate ? close.createdAt.toDate() : new Date(close.createdAt);
        const latestDate = latest?.createdAt?.toDate ? latest.createdAt.toDate() : new Date(latest?.createdAt || 0);
        return closeDate > latestDate ? close : latest;
      }, cashCloses[0])
    : null;
  
  const lastCorteTime = lastCorte 
    ? (lastCorte.createdAt?.toDate ? lastCorte.createdAt.toDate() : new Date(lastCorte.createdAt))
    : null;
  
  // Only count cash sales that happened AFTER the last corte
  // Only count cash sales that happened AFTER the last corte AND are not returned
  const currentCashInRegister = sales.reduce((sum, sale) => {
    // Should we subtract returns? Ideally yes if cash was returned.
    // For now, assuming returns involve giving cash back from register.
    
    const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
    
    // Logic for Sales - Returns
    if (!lastCorteTime || saleDate > lastCorteTime) {
      if (sale.status === 'returned') {
        // If returned and original payment was cash, subtract it
        if (sale.paymentMethod === 'cash') {
          return sum - (sale.total || 0);
        }
      } else {
        // Normal sale
        if (sale.paymentMethod === 'cash') {
          return sum + (sale.total || 0);
        }
      }
    }
    return sum;
  }, 0);

  // Payment breakdown ONLY since last corte (for corte submission)
  const paymentBreakdownSinceLastCorte = sales.reduce((acc, sale) => {
    const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
    if (!lastCorteTime || saleDate > lastCorteTime) {
      const method = sale.paymentMethod || 'cash';
      acc[method] = (acc[method] || 0) + (sale.total || 0);
    }
    return acc;
  }, { cash: 0, card: 0, transfer: 0 });

  // Card commission since last corte
  const commissionSinceLastCorte = sales.reduce((sum, sale) => {
    const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
    if (!lastCorteTime || saleDate > lastCorteTime) {
      return sum + (sale.cardCommission || 0);
    }
    return sum;
  }, 0);

  // Sales count since last corte
  const salesCountSinceLastCorte = sales.filter(sale => {
    const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
    return !lastCorteTime || saleDate > lastCorteTime;
  }).length;

  const paymentMethods = [
    { method: 'Efectivo', key: 'cash', amount: paymentBreakdown.cash || 0 },
    { method: 'Tarjeta', key: 'card', amount: paymentBreakdown.card || 0, commission: totalCardCommission },
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
    setReturnToken('');
    setTokenError('');
    setShowTokenModal(true);
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale) return;
    
    setLoading(true);
    setTokenError('');
    
    try {
      // 1. Validate Token
      const tokenData = await validateAndUseToken(returnToken, user);
      
      // 2. Process Return
      await processReturn(selectedSale, tokenData, user);
      
      alert('Devolución procesada exitosamente');
      setShowTokenModal(false);
      setShowTicketModal(false);
      
      // Refresh data
      // (Simplified refresh logic - standard useEffect will re-fetch if we triggered a update mechanism or we can reload window)
      window.location.reload();
      
    } catch (err) {
      setTokenError(err.message);
    } finally {
      setLoading(false);
    }
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
      
      // Determine close label - now only limit-based cortes
      let closeLabel = 'Corte de Caja';
      if (selectedCloseType === 'limit') {
        closeLabel = 'Corte por Límite de Caja';
      }
      
      const closeData = {
        userId: user?.uid || '',
        userName: user?.name || 'Cajero',
        closeType: selectedCloseType || 'manual',
        closeLabel,
        expectedAmount: currentCashInRegister, // Stored for admin, not shown to seller
        cashAmount,
        difference: Math.round((cashAmount - currentCashInRegister) * 100) / 100,
        notes: closeNotes || '',
        salesCount: salesCountSinceLastCorte,
        // Totals since last corte
        totalSales: paymentBreakdownSinceLastCorte.cash + paymentBreakdownSinceLastCorte.card + paymentBreakdownSinceLastCorte.transfer,
        cardCommission: commissionSinceLastCorte, // 4% commission on card sales
        storeName: storeName || 'Tienda',
        // Payment breakdown since last corte
        paymentBreakdown: {
          cash: paymentBreakdownSinceLastCorte.cash,
          card: paymentBreakdownSinceLastCorte.card,
          transfer: paymentBreakdownSinceLastCorte.transfer
        }
      };
      
      const newEntry = await addCashClose(storeId, closeData);
      
      // Update local state
      setCashCloses(prev => [...prev, newEntry]);
      
      // Store corte data for confirmation and show confirmation modal
      setLastCorteData({
        ...closeData,
        id: newEntry.id,
        createdAt: new Date()
      });
      
      setShowCashCloseModal(false);
      setShowCorteConfirmation(true);
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

      {/* Cash Limit Alert */}
      {cashLimitExceeded && !dismissedAlerts.includes('cashLimit') && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <p className="font-semibold text-red-800">
                ¡Se superó el límite de efectivo!
              </p>
              <p className="text-sm text-red-700">
                Realiza un corte de caja ahora
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" onClick={() => openCashCloseModal('limit')}>
              Hacer Corte
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
        {/* <div className="bg-white p-5 rounded-xl shadow-md">
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
        </div> */}
        
        {/* Efectivo en Caja card */}
        {/* <div className={`p-5 rounded-xl shadow-md ${cashLimitExceeded ? 'bg-red-50 border-2 border-red-300' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${cashLimitExceeded ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <DollarSign size={24} className={cashLimitExceeded ? 'text-red-600' : 'text-yellow-600'} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Efectivo en Caja</p>
              <p className={`text-2xl font-bold ${cashLimitExceeded ? 'text-red-600' : 'text-gray-800'}`}>
                {formatCurrency(currentCashInRegister)}
              </p>
              <p className="text-xs text-gray-400">Solo ventas desde último corte</p>
            </div>
          </div>
        </div> */}
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
                        <tr key={sale.id} className={`hover:bg-gray-50 transition border-l-4 ${sale.status === 'returned' ? 'bg-red-50 border-red-500' : 'border-transparent'}`}>
                          <td className="px-4 py-3 text-gray-600">
                            {formatTime(saleDate)}
                            {sale.status === 'returned' && (
                              <div className="mt-1">
                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Devuelto</span>
                                {sale.returnMetadata?.authorizedBy?.name && (
                                  <span className="block text-[10px] text-red-600 mt-0.5 truncate max-w-[120px]">
                                    Aut: {sale.returnMetadata.authorizedBy.name}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={`px-4 py-3 ${sale.status === 'returned' ? 'opacity-50 line-through' : ''}`}>{sale.userName || 'Cajero'}</td>
                          <td className={`px-4 py-3 ${sale.status === 'returned' ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <Badge variant={sale.status === 'returned' ? 'danger' : 'gray'}>{itemCount} items</Badge>
                              {sale.type?.startsWith('apartado_') && (
                                <Badge variant="warning" className="flex items-center gap-1">
                                  <PackageOpen size={12} />
                                  {sale.type === 'apartado_deposit' ? 'Anticipo' : 
                                   sale.type === 'apartado_complete' ? 'Liquidación' : 'Abono'}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className={`px-4 py-3 ${sale.status === 'returned' ? 'opacity-50' : ''}`}>{getPaymentBadge(sale.paymentMethod)}</td>
                          <td className={`px-4 py-3 ${sale.status === 'returned' ? 'opacity-50 line-through' : ''}`}>
                            <div className="font-bold text-gray-800">{formatCurrency(sale.total || 0)}</div>
                            {sale.paymentMethod === 'card' && (sale.cardCommission || 0) > 0 && (
                              <div className="text-xs text-red-500">-4% comisión: {formatCurrency(sale.cardCommission)}</div>
                            )}
                          </td>
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
          {/* Cash Close - Only triggered by $2K limit */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Corte de Caja</h3>
            <div className={`p-4 rounded-xl ${
              cashLimitExceeded ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cashLimitExceeded ? 'bg-red-100' : 'bg-green-100'}`}>
                    <DollarSign size={20} className={cashLimitExceeded ? 'text-red-600' : 'text-green-600'} />
                  </div>
                  <div>
                    {cashLimitExceeded ? (
                      <>
                        <p className="font-bold text-red-700">¡Límite Excedido!</p>
                        <p className="text-sm text-red-600">Se superaron ${CASH_LIMIT} en caja</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-green-700">Caja OK</p>
                        <p className="text-sm text-green-600">Límite: ${CASH_LIMIT}</p>
                      </>
                    )}
                  </div>
                </div>
                {cashLimitExceeded && (
                  <Button variant="danger" onClick={() => openCashCloseModal('limit')}>
                    Hacer Corte
                  </Button>
                )}
              </div>
              {cashLimitExceeded && (
                <div className="mt-3 p-2 bg-red-100 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  <p className="text-sm text-red-700">Realiza un corte y reporta cuánto tienes en caja.</p>
                </div>
              )}
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
                disabled={selectedSale.status === 'returned'}
              >
                {selectedSale.status === 'returned' ? 'Devuelto' : 'Devolución'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cash Close Modal */}
      <Modal
        isOpen={showCashCloseModal}
        onClose={() => setShowCashCloseModal(false)}
        title="Corte de Caja"
        size="md"
      >
        <div className="space-y-5">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <AlertTriangle size={32} className="mx-auto text-orange-500 mb-2" />
            <p className="font-bold text-orange-800">Se superó el límite de efectivo</p>
            <p className="text-sm text-orange-600">Cuenta el dinero en tu caja y repórtalo</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cuánto efectivo tienes en caja?
            </label>
            <input
              type="number"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              placeholder="Ej: 2500"
              className="w-full border border-gray-200 rounded-xl py-4 px-4 text-2xl font-bold text-center focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500"
              rows="2"
              placeholder="Observaciones..."
            />
          </div>
          
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleCashClose}
            disabled={!cashCounted || parseFloat(cashCounted) <= 0}
          >
            Enviar Corte
          </Button>
        </div>
      </Modal>

      {/* Corte Confirmation Modal - for seller to take photo */}
      <Modal
        isOpen={showCorteConfirmation}
        onClose={() => setShowCorteConfirmation(false)}
        title="✅ Corte Enviado"
        size="md"
      >
        {lastCorteData && (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <p className="text-xl font-bold text-green-800">¡Corte Registrado!</p>
              <p className="text-sm text-green-600">Toma foto de esta pantalla y envíala al grupo</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Tienda:</span>
                <span className="font-bold text-gray-800">{lastCorteData.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vendedor:</span>
                <span className="font-bold text-gray-800">{lastCorteData.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-bold text-gray-800">
                  {lastCorteData.createdAt.toLocaleDateString('es-MX')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hora:</span>
                <span className="font-bold text-gray-800">
                  {lastCorteData.createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <hr className="border-gray-200" />
              
              {/* Sales breakdown by payment method */}
              <div className="space-y-2">
                <p className="text-gray-600 text-sm font-medium">Resumen de Ventas:</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">💵 Efectivo:</span>
                  <span className="font-medium text-green-600">{formatCurrency(lastCorteData.paymentBreakdown?.cash || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">💳 Tarjeta:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(lastCorteData.paymentBreakdown?.card || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">📱 Transferencia:</span>
                  <span className="font-medium text-purple-600">{formatCurrency(lastCorteData.paymentBreakdown?.transfer || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                  <span className="text-gray-700">Total Bruto:</span>
                  <span className="font-medium text-gray-700">{formatCurrency(lastCorteData.totalSales || 0)}</span>
                </div>
                {(lastCorteData.cardCommission || 0) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>🏦 Comisión Tarjeta (4%):</span>
                    <span className="font-medium">-{formatCurrency(lastCorteData.cardCommission)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-1 border-t-2 border-gray-300">
                  <span className="text-gray-800 font-bold">Total Neto:</span>
                  <span className="font-bold text-green-700">{formatCurrency((lastCorteData.totalSales || 0) - (lastCorteData.cardCommission || 0))}</span>
                </div>
              </div>
              
              <hr className="border-gray-200" />
              <div className="flex justify-between text-lg">
                <span className="text-gray-700 font-medium">Efectivo Reportado:</span>
                <span className="font-bold text-green-600">{formatCurrency(lastCorteData.cashAmount)}</span>
              </div>
              {lastCorteData.notes && (
                <>
                  <hr className="border-gray-200" />
                  <div>
                    <span className="text-gray-600 text-sm">Notas:</span>
                    <p className="text-gray-800">{lastCorteData.notes}</p>
                  </div>
                </>
              )}
            </div>
            
            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => setShowCorteConfirmation(false)}
            >
              Cerrar
            </Button>
          </div>
        )}
      </Modal>

      {/* Token Validation Modal for Returns (Replaces PinModal) */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Autorización Requerida"
        size="sm"
      >
        <form onSubmit={handleTokenSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p>Se requiere un <b>Super Token</b> de administrador para autorizar esta devolución.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de 6 dígitos
            </label>
            <input
              type="text"
              value={returnToken}
              onChange={(e) => setReturnToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full border border-gray-300 rounded-lg py-3 px-4 text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-indigo-500 uppercase"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            {tokenError && (
              <p className="mt-1 text-sm text-red-600 font-medium">{tokenError}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={returnToken.length !== 6 || loading}
            loading={loading}
          >
            Autorizar Devolución
          </Button>
        </form>
      </Modal>
    </div>
  );
}
