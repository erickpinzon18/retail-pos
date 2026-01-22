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
  AlertCircle,
  Users2,
  Star,
  UserPlus,
  Crown,
  PackageOpen
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import SalesChart from '../../components/shared/SalesChart';
import CategoryChart from '../../components/shared/CategoryChart';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, getById, getSalesByDateRange, update, getCashClosesForDate, getClientMonthlyTotal, getApartados } from '../../api/firestoreService';

const VIP_THRESHOLD = 2000;

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
  const [storeClients, setStoreClients] = useState([]);
  const [storeApartados, setStoreApartados] = useState([]);
  const [salesDate, setSalesDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [daySales, setDaySales] = useState([]);
  const [dayCashCloses, setDayCashCloses] = useState([]);
  
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

  useEffect(() => {
    fetchDaySalesAndCloses();
  }, [store.id, salesDate]);

  const fetchCashCloses = async () => {
    try {
      const closes = await getCashClosesForDate(store.id, closesDate);
      setCashCloses(closes);
    } catch (error) {
      console.error('Error fetching cash closes:', error);
    }
  };

  const fetchDaySalesAndCloses = async () => {
    try {
      // Parse date string properly for local timezone
      const [year, month, day] = salesDate.split('-').map(Number);
      const dateStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      const salesData = await getSalesByDateRange(store.id, dateStart, dateEnd);
      setDaySales(salesData);
      
      const closesData = await getCashClosesForDate(store.id, salesDate);
      setDayCashCloses(closesData);
    } catch (error) {
      console.error('Error fetching day sales:', error);
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
        phone: fullStore?.phone || '',
        ticketFooter: fullStore?.ticketFooter || '¡Gracias por su compra!',
        paymentsAccepted: fullStore?.paymentsAccepted || { cash: true, card: true, transfer: true },
        bank: fullStore?.bank || { Bank: '', CLABE: '', Tarjeta: '' }
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
      
      // Get clients registered at this store
      const clientsData = await getAll('clients');
      const storeRegisteredClients = clientsData.filter(
        c => c.registeredAtStoreId === store.id || c.registeredAtStoreName === store.name
      );
      
      // Get monthly totals for each client
      const clientsWithTotals = await Promise.all(
        storeRegisteredClients.map(async (client) => {
          try {
            const monthlyTotal = await getClientMonthlyTotal(client.id);
            return { ...client, monthlyPurchases: monthlyTotal };
          } catch {
            return { ...client, monthlyPurchases: 0 };
          }
        })
      );
      
      setStoreClients(clientsWithTotals.sort((a, b) => (b.monthlyPurchases || 0) - (a.monthlyPurchases || 0)));
      
      // Fetch apartados for this store
      try {
        const apartadosData = await getApartados(store.id);
        setStoreApartados(apartadosData);
      } catch (e) {
        console.error('Error fetching apartados:', e);
      }
      
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
    
    // Helper to calculate total from sales list, excluding returns
    const calculateTotal = (salesList) => {
      return salesList
        .filter(s => s.status !== 'returned')
        .reduce((sum, s) => sum + (s.total || 0), 0);
    };

    const todayTotal = calculateTotal(todaySales);
    const weekTotal = calculateTotal(weekSales);
    const monthTotal = calculateTotal(monthSales);
    
    // Payment methods (exclude returns)
    const paymentMethods = { cash: 0, card: 0, transfer: 0 };
    sales.filter(s => s.status !== 'returned').forEach(s => {
      paymentMethods[s.paymentMethod || 'cash'] += s.total || 0;
    });
    
    // Top products
    const productCounts = {};
    sales.filter(s => s.status !== 'returned').forEach(sale => {
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
    sales.filter(s => s.status !== 'returned').forEach(sale => {
      (sale.items || []).forEach(item => {
        const cat = item.category || 'Sin categoría';
        categories[cat] = (categories[cat] || 0) + (item.finalPrice || item.price * (item.quantity || 1));
      });
    });
    
    // Top sellers
    const sellerStats = {};
    sales.filter(s => s.status !== 'returned').forEach(sale => {
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
      today: { total: todayTotal, count: todaySales.filter(s => s.status !== 'returned').length },
      week: { total: weekTotal, count: weekSales.filter(s => s.status !== 'returned').length },
      month: { total: monthTotal, count: monthSales.filter(s => s.status !== 'returned').length },
      avgTicket: sales.filter(s => s.status !== 'returned').length > 0 ? calculateTotal(sales) / sales.filter(s => s.status !== 'returned').length : 0,
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
          return saleDate >= d && saleDate < nextD && s.status !== 'returned';
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

  const handlePaymentToggle = (method) => {
    setFormData(prev => ({
      ...prev,
      paymentsAccepted: {
        ...prev.paymentsAccepted,
        [method]: !prev.paymentsAccepted[method]
      }
    }));
  };

  const handleBankChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bank: {
        ...prev.bank,
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'stats', label: 'Estadísticas', icon: BarChart2 },
    { id: 'ventas', label: 'Ventas', icon: DollarSign },
    { id: 'products', label: 'Productos', icon: ShoppingBag },
    { id: 'sellers', label: 'Vendedores', icon: Users },
    { id: 'clients', label: 'Clientes', icon: Users2 },
    { id: 'apartados', label: 'Apartados', icon: PackageOpen },
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
      <div className="flex gap-2 p-1 bg-gray-200 rounded-xl w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
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

      {/* Ventas Tab - Sales Timeline */}
      {activeTab === 'ventas' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Timeline de Ventas</h3>
                <p className="text-sm text-gray-500">Ventas y cortes ordenados por hora</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                <Calendar size={16} className="text-gray-400" />
                <input 
                  type="date" 
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          {(() => {
            // Calculate payment breakdown for the day
            const dayPaymentBreakdown = daySales
              .filter(s => s.status !== 'returned')
              .reduce((acc, sale) => {
              const method = sale.paymentMethod || 'cash';
              acc[method] = (acc[method] || 0) + (sale.total || 0);
              return acc;
            }, {});
            
            // Calculate total card commission (4% on card sales, stored in each sale)
            const totalCardCommission = daySales
              .filter(s => s.status !== 'returned')
              .reduce((sum, sale) => sum + (sale.cardCommission || 0), 0);
            
            const activeDaySales = daySales.filter(s => s.status !== 'returned');
            const dayTotal = activeDaySales.reduce((sum, s) => sum + (s.total || 0), 0);
            
            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg text-white">
                    <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                      <DollarSign size={18} />
                    </div>
                    <p className="text-white/80 text-xs">Ventas del Día</p>
                    <p className="text-2xl font-bold">{formatCurrency(dayTotal)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg text-white">
                    <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                      <ShoppingBag size={18} />
                    </div>
                    <p className="text-white/80 text-xs">Transacciones</p>
                    <p className="text-2xl font-bold">{activeDaySales.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl shadow-lg text-white">
                    <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                      <Wallet size={18} />
                    </div>
                    <p className="text-white/80 text-xs">Cortes Realizados</p>
                    <p className="text-2xl font-bold">{dayCashCloses.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg text-white">
                    <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                      <TrendingUp size={18} />
                    </div>
                    <p className="text-white/80 text-xs">Ticket Promedio</p>
                    <p className="text-2xl font-bold">
                      {activeDaySales.length > 0 ? formatCurrency(dayTotal / activeDaySales.length) : '$0'}
                    </p>
                  </div>
                </div>
                
                {/* Payment Method Breakdown */}
                <div className="bg-white rounded-2xl shadow-md p-5">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Wallet size={18} className="text-indigo-500" />
                    Desglose por Método de Pago
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">💵</span>
                        <p className="text-sm text-gray-600">Efectivo</p>
                      </div>
                      <p className="text-xl font-bold text-green-700">{formatCurrency(dayPaymentBreakdown.cash || 0)}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">💳</span>
                        <p className="text-sm text-gray-600">Tarjeta</p>
                      </div>
                      <p className="text-xl font-bold text-blue-700">{formatCurrency(dayPaymentBreakdown.card || 0)}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📱</span>
                        <p className="text-sm text-gray-600">Transferencia</p>
                      </div>
                      <p className="text-xl font-bold text-purple-700">{formatCurrency(dayPaymentBreakdown.transfer || 0)}</p>
                    </div>
                  </div>
                  
                  {/* Card Commission Note - Only visible to admin */}
                  {totalCardCommission > 0 && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <CreditCard size={18} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-amber-800">Comisión por Tarjeta (4%)</p>
                          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalCardCommission)}</p>
                          <p className="text-xs text-amber-600 mt-1">
                            Esta comisión no está incluida en el total del vendedor
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Diferencias de Cortes - what sellers owe */}
                  {dayCashCloses.length > 0 && (() => {
                    const totalDifference = dayCashCloses.reduce((sum, close) => sum + (close.difference || 0), 0);
                    const hasDifference = Math.abs(totalDifference) >= 0.01;
                    
                    return hasDifference ? (
                      <div className={`mt-4 border rounded-xl p-4 ${totalDifference < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${totalDifference < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                            <AlertCircle size={18} className={totalDifference < 0 ? 'text-red-600' : 'text-green-600'} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${totalDifference < 0 ? 'text-red-800' : 'text-green-800'}`}>
                              {totalDifference < 0 ? 'Diferencia Negativa (Faltante)' : 'Diferencia Positiva (Sobrante)'}
                            </p>
                            <p className={`text-2xl font-bold ${totalDifference < 0 ? 'text-red-700' : 'text-green-700'}`}>
                              {totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}
                            </p>
                            <p className={`text-xs mt-1 ${totalDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              Suma de diferencias de {dayCashCloses.length} corte(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </>
            );
          })()}

          {/* Sales Table */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ShoppingBag size={20} className="text-indigo-500" />
                Ventas del Día
              </h3>
            </div>
            <div className="overflow-x-auto">
              {daySales.length === 0 && dayCashCloses.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">Sin ventas registradas este día</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3">Hora</th>
                      <th className="text-left px-4 py-3">Vendedor</th>
                      <th className="text-left px-4 py-3">Cliente</th>
                      <th className="text-center px-4 py-3">Pago</th>
                      <th className="text-right px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      // Merge sales and closes, sort by time
                      const timeline = [
                        ...daySales.map(sale => ({
                          type: 'sale',
                          date: sale.date?.toDate ? sale.date.toDate() : new Date(sale.date),
                          data: sale
                        })),
                        ...dayCashCloses.map(close => ({
                          type: 'close',
                          date: close.createdAt?.toDate ? close.createdAt.toDate() : new Date(close.createdAt),
                          data: close
                        }))
                      ].sort((a, b) => a.date - b.date);

                      return timeline.map((item, idx) => (
                        item.type === 'sale' ? (
                          <tr key={`sale-${item.data.id || idx}`} className={`hover:bg-gray-50 border-l-4 ${item.data.status === 'returned' ? 'bg-red-50 border-red-500' : 'border-transparent'}`}>
                            <td className="px-4 py-3 text-gray-600">
                              {item.date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              {item.data.status === 'returned' && (
                                <div className="mt-1">
                                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Devuelto</span>
                                  {item.data.returnMetadata?.authorizedBy?.name && (
                                    <span className="block text-[10px] text-red-600 mt-0.5 truncate max-w-[120px]">
                                      Aut: {item.data.returnMetadata.authorizedBy.name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className={`px-4 py-3 font-medium text-gray-800 ${item.data.status === 'returned' ? 'opacity-50 line-through' : ''}`}>
                              {item.data.userName || 'Vendedor'}
                            </td>
                            <td className={`px-4 py-3 text-gray-600 ${item.data.status === 'returned' ? 'opacity-50 line-through' : ''}`}>
                              {item.data.customerName || '-'}
                            </td>
                            <td className={`px-4 py-3 text-center ${item.data.status === 'returned' ? 'opacity-50' : ''}`}>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.data.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                                item.data.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {item.data.paymentMethod === 'cash' ? 'Efectivo' : 
                                 item.data.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-bold text-gray-800 ${item.data.status === 'returned' ? 'opacity-50 line-through' : ''}`}>
                              {formatCurrency(item.data.total)}
                            </td>
                          </tr>
                        ) : (
                          <tr key={`close-${item.data.id || idx}`} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            <td className="px-4 py-4">
                              {item.date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-4 font-bold" colSpan={2}>
                              📋 CORTE • {item.data.userName || item.data.closedByName || 'Usuario'}
                              {/* Payment breakdown */}
                              {item.data.paymentBreakdown && (
                                <div className="text-xs font-normal mt-1 space-y-0.5">
                                  <span className="block">💵 Efectivo: {formatCurrency(item.data.paymentBreakdown.cash || 0)}</span>
                                  <span className="block">💳 Tarjeta: {formatCurrency(item.data.paymentBreakdown.card || 0)}</span>
                                  <span className="block">📱 Transfer: {formatCurrency(item.data.paymentBreakdown.transfer || 0)}</span>
                                  {(item.data.cardCommission || 0) > 0 && (
                                    <span className="block text-amber-200">🏦 Comisión: -{formatCurrency(item.data.cardCommission)}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="text-xs">
                                <span className="block">Reportado: {formatCurrency(item.data.cashAmount || 0)}</span>
                                <span className="block text-white/70">Esperado: {formatCurrency(item.data.expectedAmount || 0)}</span>
                                {item.data.difference !== 0 && (
                                  <span className={`block font-bold ${item.data.difference > 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    Dif: {item.data.difference > 0 ? '+' : ''}{formatCurrency(item.data.difference || 0)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="text-xl font-bold">{formatCurrency(item.data.totalSales || item.data.cashAmount || 0)}</div>
                              <div className="text-xs text-white/70">Total Ventas</div>
                            </td>
                          </tr>
                        )
                      ));
                    })()}
                  </tbody>
                </table>
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
            <div className="overflow-x-auto">
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
            </div>
          )}
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Client Stats for this Store */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Users2 size={18} />
                <span className="text-white/80 text-sm">Clientes Registrados</span>
              </div>
              <p className="text-2xl font-bold">{storeClients.length}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Star size={18} />
                <span className="text-white/80 text-sm">Clientes VIP</span>
              </div>
              <p className="text-2xl font-bold">
                {storeClients.filter(c => (c.monthlyPurchases || 0) >= VIP_THRESHOLD).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} />
                <span className="text-white/80 text-sm">Compras del Mes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(storeClients.reduce((sum, c) => sum + (c.monthlyPurchases || 0), 0))}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={18} />
                <span className="text-white/80 text-sm">% VIP</span>
              </div>
              <p className="text-2xl font-bold">
                {storeClients.length > 0 
                  ? Math.round((storeClients.filter(c => (c.monthlyPurchases || 0) >= VIP_THRESHOLD).length / storeClients.length) * 100) 
                  : 0}%
              </p>
            </div>
          </div>

          {/* Clients Table */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users2 size={20} className="text-indigo-600" />
                Clientes Registrados en Esta Tienda
              </h3>
            </div>
            {storeClients.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users2 size={48} className="mx-auto mb-3 opacity-50" />
                <p>No hay clientes registrados en esta tienda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {storeClients.slice(0, 15).map((client, idx) => {
                  const isVip = (client.monthlyPurchases || 0) >= VIP_THRESHOLD;
                  return (
                    <div key={client.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-600' :
                        idx === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{client.name}</p>
                        <p className="text-xs text-gray-500">#{client.clientId} • {client.phone || 'Sin tel'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(client.monthlyPurchases || 0)}</p>
                        {isVip && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⭐ VIP</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apartados Tab */}
      {activeTab === 'apartados' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <PackageOpen size={18} />
              </div>
              <p className="text-white/80 text-xs">Total</p>
              <p className="text-2xl font-bold">{storeApartados.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <Clock size={18} />
              </div>
              <p className="text-white/80 text-xs">Activos</p>
              <p className="text-2xl font-bold">
                {storeApartados.filter(a => a.status === 'active').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <CheckCircle size={18} />
              </div>
              <p className="text-white/80 text-xs">Completados</p>
              <p className="text-2xl font-bold">
                {storeApartados.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <DollarSign size={18} />
              </div>
              <p className="text-white/80 text-xs">Cobrado</p>
              <p className="text-xl font-bold">
                {formatCurrency(storeApartados.reduce((sum, a) => sum + (a.depositPaid || 0), 0))}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <TrendingUp size={18} />
              </div>
              <p className="text-white/80 text-xs">Por Cobrar</p>
              <p className="text-xl font-bold">
                {formatCurrency(storeApartados.filter(a => a.status === 'active').reduce((sum, a) => sum + (a.remainingBalance || 0), 0))}
              </p>
            </div>
          </div>

          {/* Active Apartados List */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PackageOpen size={20} className="text-orange-500" />
                Apartados Activos
              </h3>
            </div>
            {storeApartados.filter(a => a.status === 'active').length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay apartados activos</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {storeApartados.filter(a => a.status === 'active').map(apt => {
                  const dueDate = apt.dueDate?.toDate ? apt.dueDate.toDate() : new Date(apt.dueDate);
                  const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                  const progress = apt.total > 0 ? ((apt.depositPaid / apt.total) * 100).toFixed(0) : 0;
                  
                  return (
                    <div key={apt.id} className={`p-4 border-l-4 ${
                      daysLeft <= 3 ? 'border-red-500 bg-red-50' : 
                      daysLeft <= 7 ? 'border-yellow-500 bg-yellow-50' : 'border-green-500'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-800">{apt.apartadoNumber}</p>
                          <p className="text-sm text-gray-600">{apt.clientName} • #{apt.clientClientId}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            daysLeft <= 3 ? 'bg-red-100 text-red-700' : 
                            daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {daysLeft}d restantes
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Pagado: {formatCurrency(apt.depositPaid)}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-orange-400 to-amber-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Restante</p>
                          <p className="font-bold text-orange-600">{formatCurrency(apt.remainingBalance)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Store Information */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Store size={20} className="text-indigo-600" />
                Información de la Tienda
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Tienda</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    placeholder="55 1234 5678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Calle, Número, Colonia"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-indigo-600" />
                Métodos de Pago Aceptados
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => handlePaymentToggle('cash')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                    formData.paymentsAccepted?.cash 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <Banknote size={28} className={formData.paymentsAccepted?.cash ? 'text-green-600' : 'text-gray-400'} />
                  <span className="font-medium">Efectivo</span>
                  {formData.paymentsAccepted?.cash && <Badge variant="success">Activo</Badge>}
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentToggle('card')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                    formData.paymentsAccepted?.card 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <CreditCard size={28} className={formData.paymentsAccepted?.card ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="font-medium">Tarjeta</span>
                  {formData.paymentsAccepted?.card && <Badge variant="info">Activo</Badge>}
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentToggle('transfer')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                    formData.paymentsAccepted?.transfer 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <ArrowRightLeft size={28} className={formData.paymentsAccepted?.transfer ? 'text-yellow-600' : 'text-gray-400'} />
                  <span className="font-medium">Transferencia</span>
                  {formData.paymentsAccepted?.transfer && <Badge variant="warning">Activo</Badge>}
                </button>
              </div>
              
              {/* Bank Details */}
              {formData.paymentsAccepted?.transfer && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-3">Datos Bancarios (para transferencias)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Banco</label>
                      <input
                        type="text"
                        value={formData.bank?.Bank || ''}
                        onChange={(e) => handleBankChange('Bank', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="BBVA, Santander..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">CLABE</label>
                      <input
                        type="text"
                        value={formData.bank?.CLABE || ''}
                        onChange={(e) => handleBankChange('CLABE', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="18 dígitos"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Número de Tarjeta</label>
                      <input
                        type="text"
                        value={formData.bank?.Tarjeta || ''}
                        onChange={(e) => handleBankChange('Tarjeta', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg" icon={<CheckCircle size={18} />}>
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </div>

          {/* Ticket Preview Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-5 sticky top-6">
              <h3 className="font-bold text-gray-800 mb-4">Vista Previa del Ticket</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje de Agradecimiento
                </label>
                <input
                  type="text"
                  value={formData.ticketFooter}
                  onChange={(e) => setFormData(prev => ({ ...prev, ticketFooter: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                  placeholder="¡Gracias por su compra!"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300 font-mono text-xs text-gray-800 shadow-sm">
                <p className="text-center font-bold text-sm">** {formData.name || 'Mi Tienda'} **</p>
                <p className="text-center text-gray-600">{formData.address || 'Dirección'}</p>
                <p className="text-center text-gray-600">Tel: {formData.phone || '---'}</p>
                <hr className="border-dashed border-gray-300 my-2" />
                <p className="text-gray-600">Cajero: Ana García</p>
                <p className="text-gray-600">Fecha: {new Date().toLocaleDateString('es-MX')}</p>
                <hr className="border-dashed border-gray-300 my-2" />
                <div className="flex justify-between">
                  <span>1x Camisa Casual</span>
                  <span>$299.99</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Pantalón</span>
                  <span>$1,099.00</span>
                </div>
                <hr className="border-dashed border-gray-300 my-2" />
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>$1,398.99</span>
                </div>
                <hr className="border-dashed border-gray-300 my-2" />
                <p className="text-center mt-2 text-gray-600">{formData.ticketFooter}</p>
              </div>
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
