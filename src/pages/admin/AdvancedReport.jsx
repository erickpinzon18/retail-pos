import { useState } from 'react';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card, { CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import { formatCurrency } from '../../utils/formatCurrency';

// Mock data
const topEmployees = [
  { name: 'Carlos Mendoza', store: 'Tienda Centro', sales: 85320 },
  { name: 'Sofía Hernández', store: 'Plaza Mayor', sales: 82150 },
];

const productivityData = [
  { name: 'Ana García', sales: 58430, orders: 412, avgTicket: 141.82, itemsPerTicket: 2.1 },
  { name: 'Juan López', sales: 55120, orders: 398, avgTicket: 138.49, itemsPerTicket: 1.9 },
];

export default function AdvancedReport() {
  const [selectedStore, setSelectedStore] = useState('');
  const navigate = useNavigate();

  const tabs = [
    {
      id: 'general',
      label: 'Reporte General',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <p className="text-sm text-gray-500">Ventas Totales</p>
              <p className="text-2xl font-bold">$1.2M</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Ganancia Neta</p>
              <p className="text-2xl font-bold">$450K</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Ticket Promedio</p>
              <p className="text-2xl font-bold">{formatCurrency(138.90)}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Top Producto</p>
              <p className="text-lg font-bold">Pantalón Mezclilla</p>
            </Card>
          </div>
          <Card>
            <CardTitle className="mb-4">Top 5 Empleados (Productividad)</CardTitle>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Empleado</th>
                  <th className="px-4 py-2">Tienda</th>
                  <th className="px-4 py-2">Ventas</th>
                </tr>
              </thead>
              <tbody>
                {topEmployees.map((emp) => (
                  <tr key={emp.name} className="border-b">
                    <td className="px-4 py-2 font-medium">{emp.name}</td>
                    <td className="px-4 py-2">{emp.store}</td>
                    <td className="px-4 py-2 font-semibold text-green-600">{formatCurrency(emp.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ),
    },
    {
      id: 'tienda',
      label: 'Por Tienda',
      content: (
        <div className="space-y-6">
          <select
            className="w-full md:w-1/3 border border-gray-300 rounded-lg p-2"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="">Selecciona una tienda para ver su reporte</option>
            <option value="centro">Tienda Centro</option>
            <option value="plaza">Tienda Plaza Mayor</option>
          </select>
          {selectedStore && (
            <Card>
              <CardTitle className="mb-4">Reporte de Productividad por Cajero</CardTitle>
              <p className="text-sm text-gray-500 mb-4">
                Utiliza estos datos para calcular bonos y evaluar el rendimiento del personal.
              </p>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Cajero</th>
                    <th className="px-4 py-2">Ventas</th>
                    <th className="px-4 py-2">Órdenes</th>
                    <th className="px-4 py-2">Ticket Promedio</th>
                    <th className="px-4 py-2">Artículos/Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {productivityData.map((emp) => (
                    <tr key={emp.name} className="border-b">
                      <td className="px-4 py-2 font-medium">{emp.name}</td>
                      <td className="px-4 py-2 font-semibold">{formatCurrency(emp.sales)}</td>
                      <td className="px-4 py-2">{emp.orders}</td>
                      <td className="px-4 py-2">{formatCurrency(emp.avgTicket)}</td>
                      <td className="px-4 py-2">{emp.itemsPerTicket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ),
    },
    {
      id: 'grupo',
      label: 'Por Grupo de Tiendas',
      content: (
        <div>
          <select className="w-full md:w-1/3 border border-gray-300 rounded-lg p-2">
            <option>Selecciona un grupo para ver su reporte</option>
            <option>Tiendas del Bajío</option>
            <option>Tiendas del Norte</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes Avanzados</h1>
          <p className="text-gray-500 mt-1">Analiza el rendimiento y exporta datos clave de tu negocio.</p>
        </div>
        <div className="flex items-center gap-4">
          <input type="date" className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" />
          <Button icon={<Download size={20} />} onClick={() => navigate('/admin/reports/generate')}>
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="general" />
    </div>
  );
}
