import { useState } from 'react';
import { DollarSign, Receipt, UserPlus } from 'lucide-react';
import Card, { CardTitle } from '../../components/ui/Card';
import StatsCard from '../../components/shared/StatsCard';
import SalesChart from '../../components/shared/SalesChart';
import CategoryChart from '../../components/shared/CategoryChart';
import { formatCurrency } from '../../utils/formatCurrency';

// Mock data for demo
const mockSalesData = [
  { label: 'Tienda Centro', values: [150000, 180000, 165000, 210000, 190000, 250000, 230000] },
  { label: 'Tienda Plaza Mayor', values: [120000, 150000, 145000, 180000, 170000, 220000, 200000] },
  { label: 'Tienda Sur', values: [90000, 110000, 100000, 130000, 120000, 160000, 150000] },
];

const salesLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const categoryData = [45, 25, 15, 15];
const categoryLabels = ['Ropa', 'Hogar', 'Electrónicos', 'Alimentos'];

const topStores = [
  { name: 'Tienda Centro', sales: 450123.80, orders: 3102, avgTicket: 145.11 },
  { name: 'Tienda Plaza Mayor', sales: 380560.20, orders: 2850, avgTicket: 133.53 },
  { name: 'Tienda Sur', sales: 290800.00, orders: 2155, avgTicket: 134.94 },
];

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState('week');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard General</h1>
          <p className="text-gray-500 mt-1">
            Vista consolidada del rendimiento de todas las tiendas.
          </p>
        </div>
        <div className="flex space-x-2 p-1 bg-gray-200 rounded-lg">
          {['day', 'week', 'month'].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${
                timeFilter === filter
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {filter === 'day' ? 'Día' : filter === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Ventas Totales (Semana)"
          value={formatCurrency(1245320.50)}
          icon={<DollarSign size={24} />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Órdenes Realizadas"
          value="8,912"
          icon={<Receipt size={24} />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Nuevos Clientes"
          value="345"
          icon={<UserPlus size={24} />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Sales Performance Chart */}
      <Card>
        <CardTitle className="mb-4">Rendimiento de Ventas por Tienda</CardTitle>
        <SalesChart data={mockSalesData} labels={salesLabels} />
      </Card>

      {/* Employee of the Month & Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee of the Month */}
        <Card className="flex flex-col">
          <CardTitle className="text-center mb-4">Empleado del Mes</CardTitle>
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-gray-200 mx-auto ring-4 ring-indigo-200 flex items-center justify-center text-2xl font-bold text-gray-600">
              CM
            </div>
            <p className="font-bold text-gray-800 mt-3">Carlos Mendoza</p>
            <p className="text-sm text-gray-500 mb-4">Tienda Centro</p>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-200 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ventas del Mes:</span>
              <span className="font-semibold text-green-600">{formatCurrency(58430)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Órdenes Procesadas:</span>
              <span className="font-semibold text-gray-800">412</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ticket Promedio:</span>
              <span className="font-semibold text-gray-800">{formatCurrency(141.82)}</span>
            </div>
          </div>
        </Card>

        {/* Category Chart */}
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Ventas por Categoría (Global)</CardTitle>
          <CategoryChart data={categoryData} labels={categoryLabels} />
        </Card>
      </div>

      {/* Top Stores Table */}
      <Card>
        <CardTitle className="mb-4">Tiendas con Mejor Desempeño</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Tienda</th>
                <th scope="col" className="px-6 py-3">Ventas</th>
                <th scope="col" className="px-6 py-3">Órdenes</th>
                <th scope="col" className="px-6 py-3">Ticket Promedio</th>
              </tr>
            </thead>
            <tbody>
              {topStores.map((store, index) => (
                <tr key={store.name} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{store.name}</td>
                  <td className={`px-6 py-4 ${index === 0 ? 'font-semibold text-green-600' : ''}`}>
                    {formatCurrency(store.sales)}
                  </td>
                  <td className="px-6 py-4">{store.orders.toLocaleString()}</td>
                  <td className="px-6 py-4">{formatCurrency(store.avgTicket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
