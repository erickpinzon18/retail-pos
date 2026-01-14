import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Store, 
  ShoppingBag, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Award,
  Users2,
  Star,
  UserPlus,
  Crown
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, getSalesByDateRange, getClientMonthlyTotal } from '../../api/firestoreService';
import SalesChart from '../../components/shared/SalesChart';
import CategoryChart from '../../components/shared/CategoryChart';

const VIP_THRESHOLD = 2000;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [salesData, setSalesData] = useState({
    today: 0,
    yesterday: 0,
    week: 0,
    lastWeek: 0,
    month: 0,
    transactions: 0,
    averageTicket: 0
  });
  const [storeStats, setStoreStats] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [clientStats, setClientStats] = useState({
    total: 0,
    vip: 0,
    newThisMonth: 0,
    topClients: [],
    topRegistrars: [],
    registrarByStore: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const storesData = await getAll('stores');
      setStores(storesData);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      const monthStart = new Date(today);
      monthStart.setDate(1);
      
      let allSalesTemp = [];
      const storeStatsTemp = [];
      
      for (const store of storesData) {
        const sales = await getSalesByDateRange(store.id, monthStart, new Date());
        allSalesTemp = [...allSalesTemp, ...sales.map(s => ({ ...s, storeName: store.name, storeId: store.id }))];
        
        const storeSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const storeTransactions = sales.length;
        
        storeStatsTemp.push({
          id: store.id,
          name: store.name,
          sales: storeSales,
          transactions: storeTransactions,
          avgTicket: storeTransactions > 0 ? storeSales / storeTransactions : 0
        });
      }
      
      setAllSales(allSalesTemp);
      setStoreStats(storeStatsTemp.sort((a, b) => b.sales - a.sales));
      
      // Calculate totals
      const todaySales = allSalesTemp
        .filter(s => {
          const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          return d >= today;
        })
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      const yesterdaySales = allSalesTemp
        .filter(s => {
          const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          return d >= yesterday && d < today;
        })
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      const weekSales = allSalesTemp
        .filter(s => {
          const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          return d >= weekStart;
        })
        .reduce((sum, s) => sum + (s.total || 0), 0);
        
      const lastWeekSales = allSalesTemp
        .filter(s => {
          const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          return d >= lastWeekStart && d < weekStart;
        })
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      const monthSales = allSalesTemp.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalTransactions = allSalesTemp.length;
      
      setSalesData({
        today: todaySales,
        yesterday: yesterdaySales,
        week: weekSales,
        lastWeek: lastWeekSales,
        month: monthSales,
        transactions: totalTransactions,
        averageTicket: totalTransactions > 0 ? monthSales / totalTransactions : 0
      });
      
      // Top products by category
      const productCounts = {};
      allSalesTemp.forEach(sale => {
        (sale.items || []).forEach(item => {
          const name = item.name || 'Producto';
          const category = item.category || 'Sin categoría';
          if (!productCounts[name]) {
            productCounts[name] = { name, category, quantity: 0, revenue: 0 };
          }
          productCounts[name].quantity += item.quantity || 1;
          productCounts[name].revenue += item.finalPrice || (item.price * (item.quantity || 1));
        });
      });
      
      setTopProducts(
        Object.values(productCounts)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );
      
      // Top sellers
      const sellerCounts = {};
      allSalesTemp.forEach(sale => {
        const name = sale.userName || 'Cajero';
        if (!sellerCounts[name]) {
          sellerCounts[name] = { name, storeName: sale.storeName, sales: 0, transactions: 0 };
        }
        sellerCounts[name].sales += sale.total || 0;
        sellerCounts[name].transactions += 1;
      });
      
      setTopSellers(
        Object.values(sellerCounts)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5)
      );
      
      // Fetch client statistics
      const clientsData = await getAll('clients');
      const clientMonthStart = new Date();
      clientMonthStart.setDate(1);
      clientMonthStart.setHours(0, 0, 0, 0);
      
      // Calculate client metrics with actual monthly totals
      const clientsWithTotals = await Promise.all(
        clientsData.map(async (client) => {
          try {
            const monthlyTotal = await getClientMonthlyTotal(client.id);
            return { ...client, monthlyPurchases: monthlyTotal };
          } catch {
            return { ...client, monthlyPurchases: 0 };
          }
        })
      );
      
      const vipClients = clientsWithTotals.filter(c => (c.monthlyPurchases || 0) >= VIP_THRESHOLD);
      const newClients = clientsData.filter(c => {
        const created = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return created >= clientMonthStart;
      });
      
      // Top clients by monthly purchases
      const topClients = [...clientsWithTotals]
        .sort((a, b) => (b.monthlyPurchases || 0) - (a.monthlyPurchases || 0))
        .slice(0, 5);
      
      // Top registrars (who registered most clients)
      const registrarCounts = {};
      clientsData.forEach(client => {
        const name = client.registeredByName || 'Desconocido';
        if (!registrarCounts[name]) {
          registrarCounts[name] = { 
            name, 
            count: 0, 
            storeName: client.registeredAtStoreName || 'N/A',
            clients: []
          };
        }
        registrarCounts[name].count += 1;
        registrarCounts[name].clients.push(client.name);
      });
      
      const topRegistrars = Object.values(registrarCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      setClientStats({
        total: clientsData.length,
        vip: vipClients.length,
        newThisMonth: newClients.length,
        topClients,
        topRegistrars,
        registrarByStore: []
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const salesChartData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const labels = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(days[d.getDay()]);
    }
    
    const storeData = stores.map(store => {
      const values = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        
        const daySales = allSales
          .filter(s => {
            const saleDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
            return s.storeId === store.id && saleDate >= d && saleDate < nextD;
          })
          .reduce((sum, s) => sum + (s.total || 0), 0);
        
        values.push(daySales);
      }
      return { label: store.name, values };
    });
    
    return { labels, data: storeData };
  }, [allSales, stores]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    const categories = {};
    allSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const cat = item.category || 'Sin categoría';
        categories[cat] = (categories[cat] || 0) + (item.finalPrice || item.price * (item.quantity || 1));
      });
    });
    
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map(([name]) => name),
      data: sorted.map(([, value]) => value)
    };
  }, [allSales]);

  // Payment method chart data
  const paymentChartData = useMemo(() => {
    const methods = { cash: 0, card: 0, transfer: 0 };
    allSales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      methods[method] += sale.total || 0;
    });
    return {
      labels: ['Efectivo', 'Tarjeta', 'Transferencia'],
      data: [methods.cash, methods.card, methods.transfer]
    };
  }, [allSales]);

  const getPercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const weekChange = getPercentChange(salesData.week, salesData.lastWeek);
  const dayChange = getPercentChange(salesData.today, salesData.yesterday);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Calendar size={16} />
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm">
          <Clock size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">{stores.length} tiendas activas</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm ${dayChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {dayChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {Math.abs(dayChange)}%
            </div>
          </div>
          <p className="text-white/80 text-sm">Ventas Hoy</p>
          <p className="text-3xl font-bold">{formatCurrency(salesData.today)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm ${weekChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {weekChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {Math.abs(weekChange)}%
            </div>
          </div>
          <p className="text-white/80 text-sm">Ventas Semana</p>
          <p className="text-3xl font-bold">{formatCurrency(salesData.week)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-5 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-white/80 text-sm">Ventas del Mes</p>
          <p className="text-3xl font-bold">{formatCurrency(salesData.month)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-5 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Users size={24} />
            </div>
          </div>
          <p className="text-white/80 text-sm">Ticket Promedio</p>
          <p className="text-3xl font-bold">{formatCurrency(salesData.averageTicket)}</p>
          <p className="text-white/60 text-xs mt-1">{salesData.transactions} transacciones</p>
        </div>
      </div>

      {/* Sales Performance Chart */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-600" />
          Rendimiento de Ventas (Últimos 7 días)
        </h2>
        {salesChartData.data.length > 0 ? (
          <SalesChart 
            data={salesChartData.data} 
            labels={salesChartData.labels} 
            height="350px"
          />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400">
            Sin datos de ventas
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Chart */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Ventas por Categoría</h2>
          {categoryChartData.data.length > 0 ? (
            <CategoryChart 
              data={categoryChartData.data} 
              labels={categoryChartData.labels} 
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Sin datos
            </div>
          )}
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Métodos de Pago</h2>
          <CategoryChart 
            data={paymentChartData.data} 
            labels={paymentChartData.labels} 
          />
        </div>

        {/* Top Seller */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award size={20} className="text-yellow-500" />
            Mejor Vendedor del Mes
          </h2>
          {topSellers.length > 0 ? (
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-yellow-200">
                {topSellers[0].name.charAt(0)}
              </div>
              <p className="font-bold text-gray-800 mt-3">{topSellers[0].name}</p>
              <p className="text-sm text-gray-500">{topSellers[0].storeName}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ventas:</span>
                  <span className="font-bold text-green-600">{formatCurrency(topSellers[0].sales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transacciones:</span>
                  <span className="font-bold">{topSellers[0].transactions}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              Sin datos
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Performance */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Store size={20} className="text-indigo-600" />
              Rendimiento por Tienda
            </h2>
          </div>
          <div className="p-5">
            {storeStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay datos</p>
            ) : (
              <div className="space-y-4">
                {storeStats.map((store, idx) => {
                  const maxSales = storeStats[0]?.sales || 1;
                  const percentage = (store.sales / maxSales) * 100;
                  
                  return (
                    <div key={store.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                            idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                            idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{store.name}</p>
                            <p className="text-xs text-gray-500">{store.transactions} ventas</p>
                          </div>
                        </div>
                        <p className="font-bold text-gray-800">{formatCurrency(store.sales)}</p>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            idx === 0 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                            idx === 1 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                            'bg-gradient-to-r from-purple-400 to-pink-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag size={20} className="text-purple-600" />
              Productos Más Vendidos
            </h2>
          </div>
          <div className="p-5">
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, idx) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category} • {product.quantity} uds</p>
                    </div>
                    <p className="font-bold text-gray-800">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Sellers Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-green-600" />
            Ranking de Vendedores
          </h2>
        </div>
        {topSellers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Vendedor</th>
                  <th className="px-5 py-3 text-left">Tienda</th>
                  <th className="px-5 py-3 text-right">Ventas</th>
                  <th className="px-5 py-3 text-right">Transacciones</th>
                  <th className="px-5 py-3 text-right">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topSellers.map((seller, idx) => (
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
                    <td className="px-5 py-4 text-gray-600">{seller.storeName}</td>
                    <td className="px-5 py-4 text-right font-bold text-green-600">
                      {formatCurrency(seller.sales)}
                    </td>
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

      {/* Client Statistics Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users2 size={24} className="text-indigo-600" />
          Estadísticas de Clientes
        </h2>
        
        {/* Client Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users2 size={16} className="text-blue-500" />
              <span className="text-sm text-gray-500">Total Clientes</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{clientStats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-yellow-500" />
              <span className="text-sm text-gray-500">Clientes VIP</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{clientStats.vip}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus size={16} className="text-green-500" />
              <span className="text-sm text-gray-500">Nuevos Este Mes</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{clientStats.newThisMonth}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-purple-500" />
              <span className="text-sm text-gray-500">% VIP</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {clientStats.total > 0 ? Math.round((clientStats.vip / clientStats.total) * 100) : 0}%
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clients */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Crown size={16} className="text-yellow-500" />
                Mejores Clientes del Mes
              </h3>
            </div>
            <div className="p-4">
              {clientStats.topClients.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {clientStats.topClients.map((client, idx) => (
                    <div key={client.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-600' :
                          idx === 2 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{client.name}</p>
                          <p className="text-xs text-gray-400">#{client.clientId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-sm">{formatCurrency(client.monthlyPurchases || 0)}</p>
                        {(client.monthlyPurchases || 0) >= VIP_THRESHOLD && (
                          <span className="text-xs text-yellow-600">⭐ VIP</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Client Registrars */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <UserPlus size={16} className="text-green-500" />
                Vendedores que Más Registran Clientes
              </h3>
            </div>
            <div className="p-4">
              {clientStats.topRegistrars.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {clientStats.topRegistrars.map((registrar, idx) => (
                    <div key={registrar.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-green-100 text-green-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-600' :
                          idx === 2 ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{registrar.name}</p>
                          <p className="text-xs text-gray-400">{registrar.storeName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">{registrar.count}</p>
                        <p className="text-xs text-gray-400">clientes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
