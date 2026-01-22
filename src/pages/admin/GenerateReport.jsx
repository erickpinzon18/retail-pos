import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getAll, getSalesByDateRange } from '../../api/firestoreService';

export default function GenerateReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [stores, setStores] = useState([]);
  const [sales, setSales] = useState([]);
  
  // Date range filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  
  useEffect(() => {
    fetchStores();
  }, []);
  
  useEffect(() => {
    if (stores.length > 0) {
      fetchData();
    }
  }, [stores, startDate, endDate, selectedStoreId]);
  
  const fetchStores = async () => {
    try {
      const storesData = await getAll('stores');
      setStores(storesData);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      let allSales = [];
      const storesToFetch = selectedStoreId === 'all' ? stores : stores.filter(s => s.id === selectedStoreId);
      
      for (const store of storesToFetch) {
        const storeSales = await getSalesByDateRange(store.id, start, end);
        allSales = [...allSales, ...storeSales.map(s => ({ ...s, storeName: store.name, storeId: store.id }))];
      }
      
      allSales.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setSales(allSales);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const transactions = sales.length;
    const profit = totalSales * 0.35;
    const avgTicket = transactions > 0 ? totalSales / transactions : 0;
    
    const methods = { cash: 0, card: 0, transfer: 0 };
    sales.forEach(s => {
      methods[s.paymentMethod || 'cash'] += s.total || 0;
    });
    
    const storeStats = {};
    sales.forEach(sale => {
      const name = sale.storeName;
      if (!storeStats[name]) {
        storeStats[name] = { name, sales: 0, transactions: 0 };
      }
      storeStats[name].sales += sale.total || 0;
      storeStats[name].transactions += 1;
    });
    const storeBreakdown = Object.values(storeStats).sort((a, b) => b.sales - a.sales);
    
    const sellerStats = {};
    sales.forEach(sale => {
      const name = sale.userName || 'Vendedor';
      if (!sellerStats[name]) {
        sellerStats[name] = { name, storeName: sale.storeName, sales: 0, transactions: 0 };
      }
      sellerStats[name].sales += sale.total || 0;
      sellerStats[name].transactions += 1;
    });
    const sellerRanking = Object.values(sellerStats).sort((a, b) => b.sales - a.sales).slice(0, 10);
    
    return { totalSales, profit, transactions, avgTicket, methods, storeBreakdown, sellerRanking };
  }, [sales]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;
      
      // Header
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Flea Market - Reporte de Ventas', margin, y);
      y += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const dateRangeText = `Periodo: ${startDateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endDateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      const storeText = selectedStoreId === 'all' ? 'Todas las tiendas' : stores.find(s => s.id === selectedStoreId)?.name || 'Tienda';
      const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      
      pdf.text(dateRangeText, margin, y);
      y += 5;
      pdf.text(`Tienda: ${storeText}`, margin, y);
      y += 5;
      pdf.text(`Generado: ${today}`, margin, y);
      y += 12;
      
      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
      
      // Executive Summary
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumen Ejecutivo', margin, y);
      y += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const summaryData = [
        ['Ventas Totales:', formatCurrency(stats.totalSales)],
        ['Ganancia Estimada (35%):', formatCurrency(stats.profit)],
        ['Transacciones:', stats.transactions.toString()],
        ['Ticket Promedio:', formatCurrency(stats.avgTicket)]
      ];
      
      summaryData.forEach(([label, value]) => {
        pdf.text(label, margin, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, margin + 55, y);
        pdf.setFont('helvetica', 'normal');
        y += 6;
      });
      y += 5;
      
      // Payment Methods
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Metodos de Pago', margin, y);
      y += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Efectivo: ${formatCurrency(stats.methods.cash)}  |  Tarjeta: ${formatCurrency(stats.methods.card)}  |  Transferencia: ${formatCurrency(stats.methods.transfer)}`, margin, y);
      y += 12;
      
      // Store Breakdown
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Rendimiento por Tienda', margin, y);
      y += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tienda', margin, y);
      pdf.text('Ventas', margin + 60, y);
      pdf.text('Trans.', margin + 100, y);
      pdf.text('Ticket Prom.', margin + 130, y);
      y += 5;
      
      pdf.setFont('helvetica', 'normal');
      stats.storeBreakdown.forEach(store => {
        pdf.text(store.name, margin, y);
        pdf.text(formatCurrency(store.sales), margin + 60, y);
        pdf.text(store.transactions.toString(), margin + 100, y);
        pdf.text(formatCurrency(store.transactions > 0 ? store.sales / store.transactions : 0), margin + 130, y);
        y += 5;
      });
      y += 8;
      
      // Seller Ranking
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top 10 Vendedores', margin, y);
      y += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('#', margin, y);
      pdf.text('Vendedor', margin + 10, y);
      pdf.text('Tienda', margin + 60, y);
      pdf.text('Trans.', margin + 110, y);
      pdf.text('Ventas', margin + 140, y);
      y += 5;
      
      pdf.setFont('helvetica', 'normal');
      stats.sellerRanking.forEach((seller, idx) => {
        pdf.text((idx + 1).toString(), margin, y);
        pdf.text(seller.name.substring(0, 25), margin + 10, y);
        pdf.text(seller.storeName?.substring(0, 20) || '', margin + 60, y);
        pdf.text(seller.transactions.toString(), margin + 110, y);
        pdf.text(formatCurrency(seller.sales), margin + 140, y);
        y += 5;
      });
      
      // New page for sales detail
      pdf.addPage();
      y = 20;
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Detalle de Ventas (${sales.length} transacciones)`, margin, y);
      y += 10;
      
      // Table headers
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fecha', margin, y);
      pdf.text('Hora', margin + 22, y);
      pdf.text('Tienda', margin + 38, y);
      pdf.text('Vendedor', margin + 70, y);
      pdf.text('Productos', margin + 100, y);
      pdf.text('Pago', margin + 145, y);
      pdf.text('Total', margin + 165, y);
      y += 5;
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      
      sales.forEach((sale, idx) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        
        const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
        const productNames = (sale.items || []).map(i => i.name).slice(0, 2).join(', ').substring(0, 25);
        const payMethod = sale.paymentMethod === 'card' ? 'Tarjeta' : sale.paymentMethod === 'transfer' ? 'Transfer' : 'Efectivo';
        
        pdf.text(date.toLocaleDateString('es-MX'), margin, y);
        pdf.text(date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), margin + 22, y);
        pdf.text((sale.storeName || '').substring(0, 15), margin + 38, y);
        pdf.text((sale.userName || '-').substring(0, 15), margin + 70, y);
        pdf.text(productNames || '-', margin + 100, y);
        pdf.text(payMethod, margin + 145, y);
        pdf.text(formatCurrency(sale.total), margin + 165, y);
        y += 4;
      });
      
      // Total
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(`TOTAL GENERAL: ${formatCurrency(stats.totalSales)}`, pageWidth - margin - 60, y);
      
      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Documento confidencial - Flea Market ' + new Date().getFullYear(), margin, 290);
      
      const storeName = selectedStoreId === 'all' ? 'todas_tiendas' : (stores.find(s => s.id === selectedStoreId)?.name || 'tienda').replace(/\s+/g, '_');
      const fileDate = `${startDate}_a_${endDate}`.replace(/-/g, '');
      pdf.save(`reporte_ventas_${storeName}_${fileDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar PDF: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const getPaymentMethod = (method) => {
    if (method === 'card') return 'Tarjeta';
    if (method === 'transfer') return 'Transfer';
    return 'Efectivo';
  };

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const dateRangeText = `${startDateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endDateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const storeText = selectedStoreId === 'all' ? 'Todas las tiendas' : stores.find(s => s.id === selectedStoreId)?.name || 'Tienda';
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Generando reporte...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Controls */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/admin/reports')}
              className="px-6 py-3 bg-gray-100 border border-gray-300 rounded-xl font-medium hover:bg-gray-200"
            >
              ← Volver
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {downloading ? '⏳ Generando...' : '📥 Descargar PDF'}
            </button>
          </div>
          
          {/* Date and Store Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas las tiendas</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center">Vista previa del reporte</p>
      </div>

      {/* Report Preview */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border">
        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl">
              🏪
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800">Flea Market</h1>
              <p className="text-gray-500">Reporte de Ventas</p>
              <p className="text-sm text-gray-600">{dateRangeText} • {storeText}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-800">{sales.length} transacciones</p>
            <p className="text-sm text-gray-500">Generado: {today}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="my-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Resumen Ejecutivo</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border border-green-200">
              <p className="text-xs text-green-700 font-medium">Ventas Totales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-700 font-medium">Ganancia Est. (35%)</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.profit)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-700 font-medium">Transacciones</p>
              <p className="text-2xl font-bold text-purple-600">{stats.transactions}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-4 rounded-xl border border-orange-200">
              <p className="text-xs text-orange-700 font-medium">Ticket Promedio</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.avgTicket)}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="my-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Métodos de Pago</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-sm text-green-700 mb-1">💵 Efectivo</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stats.methods.cash)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-sm text-blue-700 mb-1">💳 Tarjeta</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.methods.card)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="text-sm text-yellow-700 mb-1">🏦 Transferencia</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(stats.methods.transfer)}</p>
            </div>
          </div>
        </div>

        {/* Store Breakdown */}
        <div className="my-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Rendimiento por Tienda</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tienda</th>
                  <th className="px-4 py-3 text-right font-semibold">Ventas</th>
                  <th className="px-4 py-3 text-right font-semibold">Trans.</th>
                  <th className="px-4 py-3 text-right font-semibold">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.storeBreakdown.map((store, idx) => (
                  <tr key={store.name} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-800">{store.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(store.sales)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{store.transactions}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(store.transactions > 0 ? store.sales / store.transactions : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seller Ranking */}
        <div className="my-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">🏆 Top 10 Vendedores</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Vendedor</th>
                  <th className="px-4 py-3 text-left font-semibold">Tienda</th>
                  <th className="px-4 py-3 text-right font-semibold">Trans.</th>
                  <th className="px-4 py-3 text-right font-semibold">Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.sellerRanking.map((seller, idx) => (
                  <tr key={seller.name} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 text-gray-500">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{seller.name}</td>
                    <td className="px-4 py-3 text-gray-600">{seller.storeName}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{seller.transactions}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(seller.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales Preview */}
        <div className="my-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">📋 Últimas Ventas (preview)</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Hora</th>
                  <th className="px-3 py-2 text-left font-semibold">Tienda</th>
                  <th className="px-3 py-2 text-left font-semibold">Vendedor</th>
                  <th className="px-3 py-2 text-center font-semibold">Pago</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.slice(0, 10).map((sale, idx) => {
                  const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                  return (
                    <tr key={sale.id || idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-2 text-gray-700">{date.toLocaleDateString('es-MX')}</td>
                      <td className="px-3 py-2 text-gray-700">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{sale.storeName}</td>
                      <td className="px-3 py-2 text-gray-600">{sale.userName || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sale.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' :
                          sale.paymentMethod === 'transfer' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {getPaymentMethod(sale.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">{formatCurrency(sale.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sales.length > 10 && (
            <p className="text-center text-gray-400 text-xs mt-2">
              ... y {sales.length - 10} ventas más en el PDF
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 mt-6 border-t text-center text-xs text-gray-400">
          <p>Este documento es confidencial y para uso interno exclusivamente.</p>
          <p className="mt-1">© {new Date().getFullYear()} Flea Market. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
