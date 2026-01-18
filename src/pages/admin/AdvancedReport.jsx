import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Store,
  Award,
  BarChart2,
  FileText,
  Printer,
  FileSpreadsheet,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  Users2,
  Star,
  UserPlus,
  Crown,
  PackageOpen
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SalesChart from '../../components/shared/SalesChart';
import CategoryChart from '../../components/shared/CategoryChart';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, getSalesByDateRange, getCashClosesForDate, getClientMonthlyTotal, getApartados } from '../../api/firestoreService';

const VIP_THRESHOLD = 2000;

export default function AdvancedReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashCloses, setCashCloses] = useState([]);
  const [closesDate, setClosesDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [clientStats, setClientStats] = useState({
    total: 0,
    vip: 0,
    newThisMonth: 0,
    topClients: [],
    topRegistrars: [],
    byStore: []
  });
  const [apartadoStats, setApartadoStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    expired: 0,
    totalPending: 0,
    totalCollected: 0,
    byStore: [],
    allApartados: []
  });
  
  // Date range
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    if (stores.length > 0) {
      fetchCashCloses();
    }
  }, [stores, closesDate]);

  const fetchCashCloses = async () => {
    try {
      const allCloses = [];
      for (const store of stores) {
        const closes = await getCashClosesForDate(store.id, closesDate);
        closes.forEach(close => {
          allCloses.push({ ...close, storeName: store.name, storeId: store.id });
        });
      }
      setCashCloses(allCloses);
    } catch (error) {
      console.error('Error fetching cash closes:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const storesData = await getAll('stores');
      setStores(storesData);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      let allSales = [];
      for (const store of storesData) {
        const storeSales = await getSalesByDateRange(store.id, start, end);
        allSales = [...allSales, ...storeSales.map(s => ({ ...s, storeName: store.name, storeId: store.id }))];
      }
      
      setSales(allSales);
      
      // Fetch client statistics
      const clientsData = await getAll('clients');
      const clientMonthStart = new Date();
      clientMonthStart.setDate(1);
      clientMonthStart.setHours(0, 0, 0, 0);
      
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
      
      const topClients = [...clientsWithTotals]
        .sort((a, b) => (b.monthlyPurchases || 0) - (a.monthlyPurchases || 0))
        .slice(0, 10);
      
      const registrarCounts = {};
      clientsData.forEach(client => {
        const name = client.registeredByName || 'Desconocido';
        if (!registrarCounts[name]) {
          registrarCounts[name] = { name, count: 0, storeName: client.registeredAtStoreName || 'N/A' };
        }
        registrarCounts[name].count += 1;
      });
      
      const topRegistrars = Object.values(registrarCounts).sort((a, b) => b.count - a.count).slice(0, 10);
      
      // Group by store
      const byStore = {};
      clientsData.forEach(client => {
        const store = client.registeredAtStoreName || 'Desconocida';
        if (!byStore[store]) byStore[store] = { name: store, count: 0, vip: 0 };
        byStore[store].count += 1;
        if ((clientsWithTotals.find(c => c.id === client.id)?.monthlyPurchases || 0) >= VIP_THRESHOLD) {
          byStore[store].vip += 1;
        }
      });
      
      setClientStats({
        total: clientsData.length,
        vip: vipClients.length,
        newThisMonth: newClients.length,
        topClients,
        topRegistrars,
        byStore: Object.values(byStore).sort((a, b) => b.count - a.count)
      });
      
      // Fetch apartados from all stores
      let allApartados = [];
      const apartadosByStore = [];
      
      for (const store of storesData) {
        try {
          const storeApartados = await getApartados(store.id);
          allApartados = [...allApartados, ...storeApartados.map(a => ({ ...a, storeName: store.name, storeId: store.id }))];
          
          const active = storeApartados.filter(a => a.status === 'active');
          const completed = storeApartados.filter(a => a.status === 'completed');
          
          apartadosByStore.push({
            storeId: store.id,
            storeName: store.name,
            total: storeApartados.length,
            active: active.length,
            completed: completed.length,
            pending: active.reduce((sum, a) => sum + (a.remainingBalance || 0), 0),
            collected: storeApartados.reduce((sum, a) => sum + (a.depositPaid || 0), 0)
          });
        } catch (e) {
          console.error(`Error fetching apartados for store ${store.name}:`, e);
        }
      }
      
      const activeApartados = allApartados.filter(a => a.status === 'active');
      const completedApartados = allApartados.filter(a => a.status === 'completed');
      const expiredApartados = allApartados.filter(a => a.status === 'expired');
      
      setApartadoStats({
        total: allApartados.length,
        active: activeApartados.length,
        completed: completedApartados.length,
        expired: expiredApartados.length,
        totalPending: activeApartados.reduce((sum, a) => sum + (a.remainingBalance || 0), 0),
        totalCollected: allApartados.reduce((sum, a) => sum + (a.depositPaid || 0), 0),
        byStore: apartadosByStore.sort((a, b) => b.pending - a.pending),
        allApartados
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sales by selected store
  const filteredSales = useMemo(() => {
    if (selectedStore === 'all') return sales;
    return sales.filter(s => s.storeId === selectedStore);
  }, [sales, selectedStore]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const transactions = filteredSales.length;
    
    // Profit estimate (assuming 35% margin)
    const profit = totalSales * 0.35;
    
    // Payment methods
    const methods = { cash: 0, card: 0, transfer: 0 };
    filteredSales.forEach(s => {
      methods[s.paymentMethod || 'cash'] += s.total || 0;
    });
    
    // Top products
    const productStats = {};
    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.name || 'Producto';
        if (!productStats[name]) {
          productStats[name] = { name, quantity: 0, revenue: 0 };
        }
        productStats[name].quantity += item.quantity || 1;
        productStats[name].revenue += item.finalPrice || (item.price * (item.quantity || 1));
      });
    });
    
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Seller stats
    const sellerStats = {};
    filteredSales.forEach(sale => {
      const name = sale.userName || 'Vendedor';
      if (!sellerStats[name]) {
        sellerStats[name] = { 
          name, 
          storeName: sale.storeName,
          sales: 0, 
          transactions: 0,
          items: 0
        };
      }
      sellerStats[name].sales += sale.total || 0;
      sellerStats[name].transactions += 1;
      sellerStats[name].items += (sale.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
    });
    
    const topSellers = Object.values(sellerStats)
      .sort((a, b) => b.sales - a.sales);
    
    // Store comparison
    const storeStats = {};
    filteredSales.forEach(sale => {
      const name = sale.storeName;
      if (!storeStats[name]) {
        storeStats[name] = { name, sales: 0, transactions: 0 };
      }
      storeStats[name].sales += sale.total || 0;
      storeStats[name].transactions += 1;
    });
    
    const storeComparison = Object.values(storeStats)
      .sort((a, b) => b.sales - a.sales);
    
    // Categories
    const categories = {};
    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const cat = item.category || 'Sin categoría';
        categories[cat] = (categories[cat] || 0) + (item.finalPrice || item.price * (item.quantity || 1));
      });
    });
    
    return {
      totalSales,
      profit,
      transactions,
      avgTicket: transactions > 0 ? totalSales / transactions : 0,
      methods,
      topProducts,
      topSellers,
      storeComparison,
      categories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6)
    };
  }, [filteredSales]);

  // Daily chart data
  const chartData = useMemo(() => {
    const dailyTotals = {};
    
    filteredSales.forEach(sale => {
      const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      const key = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      dailyTotals[key] = (dailyTotals[key] || 0) + (sale.total || 0);
    });
    
    const labels = Object.keys(dailyTotals);
    const values = Object.values(dailyTotals);
    
    return { labels, data: [{ label: 'Ventas', values }] };
  }, [filteredSales]);

  const exportCSV = () => {
    // Simple CSV export
    const headers = ['Fecha', 'Tienda', 'Vendedor', 'Método', 'Items', 'Total'];
    const rows = filteredSales.map(s => {
      const date = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      const items = (s.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
      return [
        date.toLocaleDateString('es-MX'),
        s.storeName || '',
        s.userName || '',
        s.paymentMethod || '',
        items,
        s.total || 0
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${startDate}_${endDate}.csv`;
    a.click();
  };

  const exportExcel = () => {
    import('xlsx').then(XLSX => {
      // Prepare data for Excel
      const data = filteredSales.map(s => {
        const date = s.date?.toDate ? s.date.toDate() : new Date(s.date);
        const items = (s.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
        const productNames = (s.items || []).map(i => i.name).join('; ');
        return {
          'Fecha': date.toLocaleDateString('es-MX'),
          'Hora': date.toLocaleTimeString('es-MX'),
          'Tienda': s.storeName || '',
          'Vendedor': s.userName || '',
          'Método de Pago': s.paymentMethod === 'cash' ? 'Efectivo' : s.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia',
          'Productos': productNames,
          'Cantidad': items,
          'Total': s.total || 0
        };
      });
      
      // Create worksheet and workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 15 }, // Tienda
        { wch: 15 }, // Vendedor
        { wch: 15 }, // Método
        { wch: 40 }, // Productos
        { wch: 10 }, // Cantidad
        { wch: 12 }, // Total
      ];
      
      // Download file
      const fileName = `ventas_${selectedStore === 'all' ? 'todas' : 'tienda'}_${startDate}_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    });
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart2 },
    { id: 'products', label: 'Productos', icon: ShoppingBag },
    { id: 'sellers', label: 'Vendedores', icon: Users },
    { id: 'stores', label: 'Tiendas', icon: Store },
    { id: 'closes', label: 'Cortes', icon: Wallet },
    { id: 'clients', label: 'Clientes', icon: Users2 },
    { id: 'apartados', label: 'Apartados', icon: PackageOpen },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FileText size={32} className="text-indigo-600" />
            Reportes Avanzados
          </h1>
          <p className="text-gray-500 mt-1">Analiza el rendimiento y exporta datos clave.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
            <Calendar size={16} className="text-gray-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-0 focus:ring-0 text-sm"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-0 focus:ring-0 text-sm"
            />
          </div>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas las tiendas</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <Button icon={<Download size={18} />} onClick={exportCSV} variant="secondary">
            CSV
          </Button>
          <Button icon={<FileSpreadsheet size={18} />} onClick={exportExcel} variant="secondary">
            Excel
          </Button>
          <Button icon={<Printer size={18} />} onClick={() => navigate('/admin/reports/generate')}>
            Ver PDF
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} />
            <span className="text-white/80 text-sm">Ventas Totales</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} />
            <span className="text-white/80 text-sm">Ganancia Est.</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.profit)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={18} />
            <span className="text-white/80 text-sm">Transacciones</span>
          </div>
          <p className="text-2xl font-bold">{stats.transactions}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} />
            <span className="text-white/80 text-sm">Ticket Promedio</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</p>
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Ventas por Día</h3>
            {chartData.labels.length > 0 ? (
              <SalesChart data={chartData.data} labels={chartData.labels} height="0px" />
            ) : (
              <p className="text-center text-gray-400 py-12">Sin datos en el período</p>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Métodos de Pago</h3>
            <CategoryChart 
              data={[stats.methods.cash, stats.methods.card, stats.methods.transfer]}
              labels={['Efectivo', 'Tarjeta', 'Transferencia']}
            />
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-500">Efectivo</p>
                <p className="font-bold text-green-600 text-sm">{formatCurrency(stats.methods.cash)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Tarjeta</p>
                <p className="font-bold text-blue-600 text-sm">{formatCurrency(stats.methods.card)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Transfer</p>
                <p className="font-bold text-yellow-600 text-sm">{formatCurrency(stats.methods.transfer)}</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4">Ventas por Categoría</h3>
            {stats.categories.length > 0 ? (
              <CategoryChart 
                data={stats.categories.map(([, v]) => v)}
                labels={stats.categories.map(([k]) => k)}
              />
            ) : (
              <p className="text-center text-gray-400 py-8">Sin datos</p>
            )}
          </div>

          {/* Top 5 Sellers */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award size={20} className="text-yellow-500" />
              Top 5 Vendedores
            </h3>
            {stats.topSellers.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {stats.topSellers.slice(0, 5).map((seller, idx) => (
                  <div key={seller.name} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{seller.name}</p>
                      <p className="text-xs text-gray-500">{seller.storeName} • {seller.transactions} ventas</p>
                    </div>
                    <p className="font-bold text-green-600">{formatCurrency(seller.sales)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Productos Vendidos</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sin datos de productos</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">Producto</th>
                    <th className="px-5 py-3 text-right">Cantidad</th>
                    <th className="px-5 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.topProducts.map((product, idx) => (
                    <tr key={product.name} className="hover:bg-gray-50">
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
                      <td className="px-5 py-4 font-medium text-gray-800">{product.name}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{product.quantity} uds</td>
                      <td className="px-5 py-4 text-right font-bold text-green-600">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sellers' && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Productividad por Vendedor</h3>
          </div>
          {stats.topSellers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sin datos de vendedores</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">Vendedor</th>
                    <th className="px-5 py-3 text-left">Tienda</th>
                    <th className="px-5 py-3 text-right">Ventas</th>
                    <th className="px-5 py-3 text-right">Transacciones</th>
                    <th className="px-5 py-3 text-right">Ticket Prom.</th>
                    <th className="px-5 py-3 text-right">Artículos</th>
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
                      <td className="px-5 py-4 text-gray-600">{seller.storeName}</td>
                      <td className="px-5 py-4 text-right font-bold text-green-600">{formatCurrency(seller.sales)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{seller.transactions}</td>
                      <td className="px-5 py-4 text-right text-gray-600">
                        {formatCurrency(seller.transactions > 0 ? seller.sales / seller.transactions : 0)}
                      </td>
                      <td className="px-5 py-4 text-right text-gray-600">{seller.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stores' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats.storeComparison.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-400 lg:col-span-2">
              Sin datos de tiendas
            </div>
          ) : (
            <>
              {stats.storeComparison.map((store, idx) => {
                const maxSales = stats.storeComparison[0]?.sales || 1;
                const percentage = (store.sales / maxSales) * 100;
                
                return (
                  <div key={store.name} className="bg-white rounded-2xl shadow-md p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{store.name}</h3>
                        <p className="text-xs text-gray-500">{store.transactions} transacciones</p>
                      </div>
                      {idx === 0 && <Badge variant="success">Top</Badge>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-green-50 p-3 rounded-xl">
                        <p className="text-xs text-green-600">Ventas</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(store.sales)}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl">
                        <p className="text-xs text-blue-600">Ticket Prom.</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency(store.transactions > 0 ? store.sales / store.transactions : 0)}
                        </p>
                      </div>
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
            </>
          )}
        </div>
      )}

      {activeTab === 'closes' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Cortes de Caja del Día</h3>
                <p className="text-sm text-gray-500">Visualiza los cortes realizados por tienda</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                <Calendar size={16} className="text-gray-400" />
                <input 
                  type="date" 
                  value={closesDate}
                  onChange={(e) => setClosesDate(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} />
                <span className="text-white/80 text-sm">Total Cortes</span>
              </div>
              <p className="text-2xl font-bold">{cashCloses.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} />
                <span className="text-white/80 text-sm">Efectivo Total</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(cashCloses.reduce((sum, c) => sum + (c.cashAmount || 0), 0))}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} />
                <span className="text-white/80 text-sm">Ventas Reportadas</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(cashCloses.reduce((sum, c) => sum + (c.totalSales || 0), 0))}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} />
                <span className="text-white/80 text-sm">A Destiempo</span>
              </div>
              <p className="text-2xl font-bold">
                {cashCloses.filter(close => {
                  const closeTypeSchedule = { 'morning': 12, 'afternoon': 16, 'evening': 20 };
                  const scheduledHour = closeTypeSchedule[close.closeType];
                  if (!scheduledHour) return false;
                  const closeTime = close.createdAt?.toDate ? close.createdAt.toDate() : new Date(close.createdAt);
                  const closeMinutes = closeTime.getHours() * 60 + closeTime.getMinutes();
                  return Math.abs(closeMinutes - scheduledHour * 60) > 30;
                }).length}
              </p>
            </div>
          </div>

          {/* Closes by Store */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {stores.map(store => {
              const storeCloses = cashCloses.filter(c => c.storeId === store.id);
              
              return (
                <div key={store.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Store size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{store.name}</h3>
                        <p className="text-white/70 text-xs">{storeCloses.length} cortes</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {storeCloses.length === 0 ? (
                      <div className="text-center py-6">
                        <Wallet size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-400 text-sm">Sin cortes este día</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {storeCloses.map((close, idx) => {
                          const closeTime = close.createdAt?.toDate ? close.createdAt.toDate() : new Date(close.createdAt);
                          
                          const closeTypeNames = {
                            'morning': { name: 'Corte Mañana', scheduledHour: 12 },
                            'afternoon': { name: 'Corte Tarde', scheduledHour: 16 },
                            'evening': { name: 'Corte Noche', scheduledHour: 20 },
                            'manual': { name: 'Corte Manual', scheduledHour: null }
                          };
                          
                          const closeTypeInfo = closeTypeNames[close.closeType] || { name: close.closeType || 'Corte', scheduledHour: null };
                          
                          let isOnTime = true;
                          if (closeTypeInfo.scheduledHour !== null) {
                            const closeMinutes = closeTime.getHours() * 60 + closeTime.getMinutes();
                            const scheduledMinutes = closeTypeInfo.scheduledHour * 60;
                            isOnTime = Math.abs(closeMinutes - scheduledMinutes) <= 30;
                          }
                          
                          return (
                            <div key={close.id || idx} className="p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
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
                              <div className="grid grid-cols-2 gap-2 text-xs">
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
              );
            })}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Client Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Users2 size={20} />
                <span className="text-white/80 text-sm">Total Clientes</span>
              </div>
              <p className="text-3xl font-bold">{clientStats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Star size={20} />
                <span className="text-white/80 text-sm">Clientes VIP</span>
              </div>
              <p className="text-3xl font-bold">{clientStats.vip}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus size={20} />
                <span className="text-white/80 text-sm">Nuevos Este Mes</span>
              </div>
              <p className="text-3xl font-bold">{clientStats.newThisMonth}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-5 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={20} />
                <span className="text-white/80 text-sm">% Clientes VIP</span>
              </div>
              <p className="text-3xl font-bold">
                {clientStats.total > 0 ? Math.round((clientStats.vip / clientStats.total) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clients */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Crown size={20} className="text-yellow-500" />
                  Top 10 Mejores Clientes del Mes
                </h3>
              </div>
              <div className="p-5">
                {clientStats.topClients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Sin clientes registrados</p>
                ) : (
                  <div className="space-y-3">
                    {clientStats.topClients.map((client, idx) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-600' :
                            idx === 2 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{client.name}</p>
                            <p className="text-xs text-gray-400">#{client.clientId} • {client.phone || 'Sin tel'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(client.monthlyPurchases || 0)}</p>
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

            {/* Top Registrars */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <UserPlus size={20} className="text-green-500" />
                  Vendedores que Más Registran Clientes
                </h3>
              </div>
              <div className="p-5">
                {clientStats.topRegistrars.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {clientStats.topRegistrars.map((registrar, idx) => (
                      <div key={registrar.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-green-100 text-green-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-600' :
                            idx === 2 ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{registrar.name}</p>
                            <p className="text-xs text-gray-400">{registrar.storeName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-indigo-600 text-lg">{registrar.count}</p>
                          <p className="text-xs text-gray-400">clientes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clients by Store */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Store size={20} className="text-purple-500" />
                Clientes Registrados por Tienda
              </h3>
            </div>
            <div className="p-5">
              {clientStats.byStore.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin datos</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {clientStats.byStore.map((store, idx) => (
                    <div key={store.name} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-gray-800">{store.name}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-indigo-600">{store.count}</p>
                        <p className="text-sm text-gray-500">clientes</p>
                      </div>
                      {store.vip > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">⭐ {store.vip} VIP</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apartados Tab */}
      {activeTab === 'apartados' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <PackageOpen size={18} />
              </div>
              <p className="text-white/80 text-xs">Total</p>
              <p className="text-2xl font-bold">{apartadoStats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <Clock size={18} />
              </div>
              <p className="text-white/80 text-xs">Activos</p>
              <p className="text-2xl font-bold">{apartadoStats.active}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <CheckCircle size={18} />
              </div>
              <p className="text-white/80 text-xs">Completados</p>
              <p className="text-2xl font-bold">{apartadoStats.completed}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <AlertCircle size={18} />
              </div>
              <p className="text-white/80 text-xs">Vencidos</p>
              <p className="text-2xl font-bold">{apartadoStats.expired}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <DollarSign size={18} />
              </div>
              <p className="text-white/80 text-xs">Cobrado</p>
              <p className="text-xl font-bold">{formatCurrency(apartadoStats.totalCollected)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg text-white">
              <div className="p-2 bg-white/20 rounded-xl w-fit mb-2">
                <TrendingUp size={18} />
              </div>
              <p className="text-white/80 text-xs">Por Cobrar</p>
              <p className="text-xl font-bold">{formatCurrency(apartadoStats.totalPending)}</p>
            </div>
          </div>

          {/* Apartados by Store */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Store size={20} className="text-orange-500" />
                Apartados por Tienda
              </h3>
            </div>
            <div className="p-5">
              {apartadoStats.byStore.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin apartados registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-3 rounded-l-lg">Tienda</th>
                        <th className="px-4 py-3 text-center">Total</th>
                        <th className="px-4 py-3 text-center">Activos</th>
                        <th className="px-4 py-3 text-center">Completados</th>
                        <th className="px-4 py-3 text-center">Por Cobrar</th>
                        <th className="px-4 py-3 text-center rounded-r-lg">Cobrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {apartadoStats.byStore.map(store => (
                        <tr key={store.storeId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{store.storeName}</td>
                          <td className="px-4 py-3 text-center font-bold">{store.total}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {store.active}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              {store.completed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-orange-600">
                            {formatCurrency(store.pending)}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-green-600">
                            {formatCurrency(store.collected)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td className="px-4 py-3 rounded-l-lg">TOTAL</td>
                        <td className="px-4 py-3 text-center">{apartadoStats.total}</td>
                        <td className="px-4 py-3 text-center text-blue-600">{apartadoStats.active}</td>
                        <td className="px-4 py-3 text-center text-green-600">{apartadoStats.completed}</td>
                        <td className="px-4 py-3 text-center text-orange-600">{formatCurrency(apartadoStats.totalPending)}</td>
                        <td className="px-4 py-3 text-center text-green-600 rounded-r-lg">{formatCurrency(apartadoStats.totalCollected)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Apartados List */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PackageOpen size={20} className="text-orange-500" />
                Apartados Activos Recientes
              </h3>
            </div>
            <div className="p-5">
              {apartadoStats.allApartados.filter(a => a.status === 'active').length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin apartados activos</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apartadoStats.allApartados.filter(a => a.status === 'active').slice(0, 9).map(apt => {
                    const dueDate = apt.dueDate?.toDate ? apt.dueDate.toDate() : new Date(apt.dueDate);
                    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                    const progress = apt.total > 0 ? ((apt.depositPaid / apt.total) * 100).toFixed(0) : 0;
                    
                    return (
                      <div key={apt.id} className={`bg-gray-50 p-4 rounded-xl border-l-4 ${
                        daysLeft <= 3 ? 'border-red-500' : daysLeft <= 7 ? 'border-yellow-500' : 'border-green-500'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-800">{apt.apartadoNumber}</p>
                            <p className="text-xs text-gray-500">{apt.storeName}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            daysLeft <= 3 ? 'bg-red-100 text-red-700' : 
                            daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {daysLeft}d
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{apt.clientName}</p>
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
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-400">{apt.items?.length || 0} items</span>
                          <span className="font-bold text-orange-600">{formatCurrency(apt.remainingBalance)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
