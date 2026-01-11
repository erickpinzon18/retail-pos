import { Store, Printer } from 'lucide-react';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

const storeData = [
  { name: 'Tienda Centro', sales: 450123.80, orders: 3102, avgTicket: 145.11 },
  { name: 'Tienda Plaza Mayor', sales: 380560.20, orders: 2850, avgTicket: 133.53 },
  { name: 'Tienda Sur', sales: 290800.00, orders: 2155, avgTicket: 134.94 },
];

const employeeData = [
  { name: 'Carlos Mendoza', store: 'Tienda Centro', sales: 85320 },
  { name: 'Sofía Hernández', store: 'Plaza Mayor', sales: 82150 },
  { name: 'Ana García', store: 'Tienda Centro', sales: 58430 },
];

export default function GenerateReport() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print Controls */}
      <div className="text-center mb-6 no-print">
        <h1 className="text-2xl font-bold text-gray-800">Vista Previa de Reporte</h1>
        <p className="text-gray-500">Así se vería tu reporte exportado en formato PDF.</p>
        <Button className="mt-4" icon={<Printer size={20} />} onClick={handlePrint}>
          Imprimir / Guardar como PDF
        </Button>
      </div>

      {/* Report Document */}
      <div className="bg-white p-12 rounded-lg shadow-2xl border print:shadow-none print:border-none">
        {/* Header */}
        <header className="flex justify-between items-center pb-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Store className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Retail POS</h2>
              <p className="text-sm text-gray-500">Reporte de Rendimiento General</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-800">Septiembre 2025</p>
            <p className="text-xs text-gray-500">Generado: 07 de Octubre, 2025</p>
          </div>
        </header>

        {/* Executive Summary */}
        <section className="my-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Resumen Ejecutivo del Mes</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(1245320)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ganancia Neta</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(450180)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Órdenes</p>
              <p className="text-2xl font-bold text-gray-800">8,912</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(139.73)}</p>
            </div>
          </div>
        </section>

        {/* Store Breakdown */}
        <section className="my-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Rendimiento por Tienda</h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-6 py-3">Tienda</th>
                <th className="px-6 py-3 text-right">Ventas</th>
                <th className="px-6 py-3 text-right">Órdenes</th>
                <th className="px-6 py-3 text-right">Ticket Promedio</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {storeData.map((store, idx) => (
                <tr key={store.name} className={`border-b ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 font-medium">{store.name}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(store.sales)}</td>
                  <td className="px-6 py-4 text-right">{store.orders.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(store.avgTicket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Employee Ranking */}
        <section className="my-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ranking de Productividad de Empleados</h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-6 py-3">Empleado</th>
                <th className="px-6 py-3">Tienda</th>
                <th className="px-6 py-3 text-right">Ventas del Mes</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {employeeData.map((emp, idx) => (
                <tr key={emp.name} className={`border-b ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 font-medium">{emp.name}</td>
                  <td className="px-6 py-4">{emp.store}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(emp.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="pt-8 mt-8 border-t text-center text-xs text-gray-500">
          <p>Página 1 de 1</p>
          <p className="mt-1">Este documento es confidencial y para uso interno exclusivamente.</p>
          <p>© 2025 Retail POS. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
