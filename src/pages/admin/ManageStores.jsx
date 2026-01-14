import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Store, 
  Users, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag,
  MapPin,
  Phone,
  Calendar,
  Clock,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  BarChart2,
  Eye,
  Wallet,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SalesChart from '../../components/shared/SalesChart';
import CategoryChart from '../../components/shared/CategoryChart';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, getById, getSalesByDateRange, update, getCashClosesForDate } from '../../api/firestoreService';

export default function ManageStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const storesData = await getAll('stores');
      
      // Get sales for each store for the month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const storesWithStats = await Promise.all(
        storesData.map(async (store) => {
          const sales = await getSalesByDateRange(store.id, monthStart, new Date());
          const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
          const transactions = sales.length;
          
          // Count unique users
          const uniqueUsers = new Set(sales.map(s => s.userId)).size;
          
          return {
            ...store,
            monthSales: totalSales,
            transactions,
            activeUsers: uniqueUsers || 0,
            avgTicket: transactions > 0 ? totalSales / transactions : 0
          };
        })
      );
      
      setStores(storesWithStats);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (store) => {
    setSelectedStore(store);
  };

  const handleBack = () => {
    setSelectedStore(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando tiendas...</div>
      </div>
    );
  }

  if (selectedStore) {
    return (
      <StoreDetailView
        store={selectedStore}
        onBack={handleBack}
        onUpdate={fetchStores}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Tiendas</h1>
        <p className="text-gray-500 mt-1">Supervisa y configura cada una de tus sucursales.</p>
      </div>

      {/* Store Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div 
            key={store.id} 
            className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition group"
          >
            {/* Header */}
            <div className="h-20 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Store size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{store.name}</h2>
                <p className="text-white/70 text-xs truncate flex items-center gap-1">
                  <MapPin size={10} />
                  {store.address || 'Sin dirección'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 p-3 rounded-xl">
                  <p className="text-xs text-green-600 font-medium">Ventas del Mes</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(store.monthSales)}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="text-xs text-blue-600 font-medium">Transacciones</p>
                  <p className="text-lg font-bold text-blue-700">{store.transactions}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl">
                  <p className="text-xs text-purple-600 font-medium">Ticket Promedio</p>
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(store.avgTicket)}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl">
                  <p className="text-xs text-orange-600 font-medium">Usuarios Activos</p>
                  <p className="text-lg font-bold text-orange-700">{store.activeUsers}</p>
                </div>
              </div>

              <Button
                className="w-full"
                icon={<Eye size={16} />}
                onClick={() => handleSelectStore(store)}
              >
                Ver Detalles
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreDetailView({ store, onBack, onUpdate }) {
  const [storeData, setStoreData] = useState(store);
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [cashCloses, setCashCloses] = useState([]);
  const [closesDate, setClosesDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: store.name || '',
    address: store.address || '',
    phone: store.phone || ''
  });

  useEffect(() => {
    fetchStoreDetails();
  }, [store.id]);

  useEffect(() => {
    fetchCashCloses();
  }, [store.id, closesDate]);

  const fetchCashCloses = async () => {
    try {
      const closes = await getCashClosesForDate(store.id, closesDate);
      setCashCloses(closes);
    } catch (error) {
      console.error('Error fetching cash closes:', error);
    }
  };

  const fetchStoreDetails = async () => {
    try {
      setLoading(true);
      
      // Get full store data
      const fullStore = await getById('stores', store.id);
      setStoreData({ ...store, ...fullStore });
      setFormData({
        name: fullStore?.name || store.name || '',
        address: fullStore?.address || store.address || '',
        phone: fullStore?.phone || ''
      });
      
      // Get sales for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const salesData = await getSalesByDateRange(store.id, thirtyDaysAgo, new Date());
      setSales(salesData);
      
      // Get users who sold in this store
      const usersData = await getAll('users');
      const storeUsers = usersData.filter(u => u.storeId === store.id || !u.storeId);
      setUsers(storeUsers);
      
    } catch (error) {
      console.error('Error fetching store details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(today);
    monthStart.setDate(1);
    
    const todaySales = sales.filter(s => {
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return d >= today;
    });
    
    const weekSales = sales.filter(s => {
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return d >= weekStart;
    });
    
    const monthSales = sales.filter(s => {
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return d >= monthStart;
    });
    
    // Payment methods
    const paymentMethods = { cash: 0, card: 0, transfer: 0 };
    sales.forEach(s => {
      paymentMethods[s.paymentMethod || 'cash'] += s.total || 0;
    });
    
    // Top products
    const productCounts = {};
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.name || 'Producto';
        if (!productCounts[name]) {
          productCounts[name] = { name, quantity: 0, revenue: 0 };
        }
        productCounts[name].quantity += item.quantity || 1;
        productCounts[name].revenue += item.finalPrice || (item.price * (item.quantity || 1));
      });
    });
    
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Categories
    const categories = {};
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const cat = item.category || 'Sin categoría';
        categories[cat] = (categories[cat] || 0) + (item.finalPrice || item.price * (item.quantity || 1));
      });
    });
    
    // Top sellers
    const sellerStats = {};
    sales.forEach(sale => {
      const name = sale.userName || 'Cajero';
      if (!sellerStats[name]) {
        sellerStats[name] = { name, sales: 0, transactions: 0 };
      }
      sellerStats[name].sales += sale.total || 0;
      sellerStats[name].transactions += 1;
    });
    
    const topSellers = Object.values(sellerStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    
    return {
      today: { total: todaySales.reduce((sum, s) => sum + (s.total || 0), 0), count: todaySales.length },
      week: { total: weekSales.reduce((sum, s) => sum + (s.total || 0), 0), count: weekSales.length },
      month: { total: monthSales.reduce((sum, s) => sum + (s.total || 0), 0), count: monthSales.length },
      avgTicket: sales.length > 0 ? sales.reduce((sum, s) => sum + (s.total || 0), 0) / sales.length : 0,
      paymentMethods,
      topProducts,
      categories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topSellers
    };
  }, [sales]);

  // Chart data
  const salesChartData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      labels.push(days[d.getDay()]);
      
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      
      const daySales = sales
        .filter(s => {
          const saleDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          return saleDate >= d && saleDate < nextD;
        })
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      values.push(daySales);
    }
    
    return { labels, data: [{ label: storeData.name, values }] };
  }, [sales, storeData.name]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await update('stores', store.id, formData);
      setStoreData(prev => ({ ...prev, ...formData }));
      setShowEditModal(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'stats', label: 'Estadísticas', icon: BarChart2 },
    { id: 'products', label: 'Productos', icon: ShoppingBag },
    { id: 'sellers', label: 'Vendedores', icon: Users },
    { id: 'config', label: 'Configuración', icon: Store },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{storeData.name}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <MapPin size={14} />
            {storeData.address || 'Sin dirección'}
            {storeData.phone && (
              <>
                <span className="text-gray-300">•</span>
                <Phone size={14} />
                {storeData.phone}
              </>
            )}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowEditModal(true)}>
          Editar Tienda
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} />
            <span className="text-white/80 text-sm">Hoy</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.today.total)}</p>
          <p className="text-white/60 text-xs">{stats.today.count} ventas</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} />
            <span className="text-white/80 text-sm">Semana</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.week.total)}</p>
          <p className="text-white/60 text-xs">{stats.week.count} ventas</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} />
            <span className="text-white/80 text-sm">Mes</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.month.total)}</p>
          <p className="text-white/60 text-xs">{stats.month.count} ventas</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} />
            <span className="text-white/80 text-sm">Ticket Prom.</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</p>
          <p className="text-white/60 text-xs">{sales.length} total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-200 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Row 1: Chart + Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-4">Ventas Últimos 7 Días</h3>
              <SalesChart data={salesChartData.data} labels={salesChartData.labels} height="450px" />
            </div>

            {/* Payment Methods Donut */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-4">Métodos de Pago</h3>
              <CategoryChart 
                data={[stats.paymentMethods.cash, stats.paymentMethods.card, stats.paymentMethods.transfer]}
                labels={['Efectivo', 'Tarjeta', 'Transferencia']}
              />
              {/* Payment breakdown inline */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Efectivo</p>
                  <p className="font-bold text-green-600 text-sm">{formatCurrency(stats.paymentMethods.cash)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Tarjeta</p>
                  <p className="font-bold text-blue-600 text-sm">{formatCurrency(stats.paymentMethods.card)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Transfer</p>
                  <p className="font-bold text-yellow-600 text-sm">{formatCurrency(stats.paymentMethods.transfer)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Categories + Top Products + Cash Closes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-4">Ventas por Categoría</h3>
              {stats.categories.length > 0 ? (
                <CategoryChart 
                  data={stats.categories.map(([, v]) => v)}
                  labels={stats.categories.map(([k]) => k)}
                />
              ) : (
                <p className="text-gray-400 text-center py-8">Sin datos</p>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-4">Top 5 Productos</h3>
              {stats.topProducts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {stats.topProducts.map((product, idx) => (
                    <div key={product.name} className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-600' :
                        idx === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-sm">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cash Closes */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Cortes de Caja</h3>
                <input
                  type="date"
                  value={closesDate}
                  onChange={(e) => setClosesDate(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {cashCloses.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-400 text-sm">Sin cortes este día</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cashCloses.map((close, idx) => {
                    const closeTime = close.createdAt?.toDate ? close.createdAt.toDate() : new Date(close.createdAt);
                    
                    // Translate close types to Spanish
                    const closeTypeNames = {
                      'morning': { name: 'Corte Mañana', scheduledHour: 12 },
                      'afternoon': { name: 'Corte Tarde', scheduledHour: 16 },
                      'evening': { name: 'Corte Noche', scheduledHour: 20 },
                      'manual': { name: 'Corte Manual', scheduledHour: null }
                    };
                    
                    const closeTypeInfo = closeTypeNames[close.closeType] || { name: close.closeType || 'Corte', scheduledHour: null };
                    
                    // Check if on time (30 min margin)
                    let isOnTime = true;
                    if (closeTypeInfo.scheduledHour !== null) {
                      const closeHour = closeTime.getHours();
                      const closeMinutes = closeTime.getMinutes();
                      const totalMinutes = closeHour * 60 + closeMinutes;
                      const scheduledMinutes = closeTypeInfo.scheduledHour * 60;
                      const diffMinutes = Math.abs(totalMinutes - scheduledMinutes);
                      isOnTime = diffMinutes <= 30;
                    }
                    
                    return (
                      <div key={close.id || idx} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {isOnTime ? (
                              <CheckCircle size={14} className="text-green-500" />
                            ) : (
                              <AlertCircle size={14} className="text-orange-500" />
                            )}
                            <span className="font-medium text-gray-800 text-sm">{closeTypeInfo.name}</span>
                            {!isOnTime && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">A destiempo</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {closeTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div>
                            <p className="text-gray-500">Efectivo</p>
                            <p className="font-bold text-green-600">{formatCurrency(close.cashAmount || 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ventas</p>
                            <p className="font-bold text-gray-700">{formatCurrency(close.totalSales || 0)}</p>
                          </div>
                        </div>
                        {close.userName && (
                          <p className="text-xs text-gray-400 mt-1">Por: {close.userName}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Top Productos Vendidos</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sin datos de productos</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.topProducts.map((product, idx) => (
                <div key={product.name} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.quantity} unidades vendidas</p>
                  </div>
                  <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sellers' && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Ranking de Vendedores</h3>
          </div>
          {stats.topSellers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sin datos de vendedores</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Vendedor</th>
                  <th className="px-5 py-3 text-right">Ventas</th>
                  <th className="px-5 py-3 text-right">Transacciones</th>
                  <th className="px-5 py-3 text-right">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.topSellers.map((seller, idx) => (
                  <tr key={seller.name} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-600' :
                        idx === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-800">{seller.name}</td>
                    <td className="px-5 py-4 text-right font-bold text-green-600">{formatCurrency(seller.sales)}</td>
                    <td className="px-5 py-4 text-right text-gray-600">{seller.transactions}</td>
                    <td className="px-5 py-4 text-right text-gray-600">
                      {formatCurrency(seller.transactions > 0 ? seller.sales / seller.transactions : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Información de la Tienda</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Nombre</span>
                <span className="font-medium">{storeData.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Dirección</span>
                <span className="font-medium">{storeData.address || 'No especificada'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Teléfono</span>
                <span className="font-medium">{storeData.phone || 'No especificado'}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Métodos de Pago Aceptados</h3>
            <div className="flex gap-3">
              {storeData.paymentsAccepted?.cash !== false && (
                <Badge variant="success">Efectivo</Badge>
              )}
              {storeData.paymentsAccepted?.card !== false && (
                <Badge variant="info">Tarjeta</Badge>
              )}
              {storeData.paymentsAccepted?.transfer !== false && (
                <Badge variant="warning">Transferencia</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Tienda" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
