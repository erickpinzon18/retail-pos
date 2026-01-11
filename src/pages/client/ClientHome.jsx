import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Receipt, Tag } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatCurrency';

// Mock data
const clientData = {
  name: 'Juan Pérez',
  isVip: true,
  customerId: 'CLT-00001234',
};

const discounts = [
  { title: '15% de Descuento en tu próxima compra', validUntil: '31 Dic, 2025' },
];

const recentPurchases = [
  { store: 'Tienda Centro', date: '05 Oct, 2025', amount: 1527.30 },
  { store: 'Tienda Plaza', date: '28 Sep, 2025', amount: 899.90 },
];

const promotions = [
  { title: '20% Descuento en Chamarras', description: 'Aplica a todos los productos de la categoría "Chamarras".' },
  { title: '2x1 en Camisas', description: 'Compra una y llévate la segunda de igual o menor precio.' },
];

export default function ClientHome() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-lg">
      <main className="p-6 pb-20">
        {/* Client Header */}
        <header className="text-center pt-8 mb-6">
          <div className="h-24 w-24 rounded-full bg-gray-200 mx-auto ring-4 ring-white shadow-md flex items-center justify-center text-3xl font-bold text-gray-600">
            {clientData.name.split(' ').map(n => n[0]).join('')}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-4">{clientData.name}</h1>
          {clientData.isVip && (
            <Badge variant="warning" size="lg" className="mt-2">
              CLIENTE VIP
            </Badge>
          )}
        </header>

        {/* QR Code Section */}
        <section className="mb-8">
          <div className="bg-gray-100 p-4 rounded-xl flex flex-col items-center">
            <p className="text-sm font-medium text-gray-600 mb-2">
              Usa este QR en cualquier tienda para identificarte
            </p>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeSVG value={clientData.customerId} size={192} />
            </div>
          </div>
        </section>

        {/* Discounts Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
            <Sparkles className="text-indigo-500 mr-2" size={20} />
            Mis Descuentos
          </h2>
          <div className="space-y-3">
            {discounts.map((discount, idx) => (
              <div key={idx} className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                <p className="font-semibold text-indigo-800">{discount.title}</p>
                <p className="text-xs text-indigo-600 mt-1">Válido hasta: {discount.validUntil}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Purchases Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
            <Receipt className="text-gray-500 mr-2" size={20} />
            Compras Recientes
          </h2>
          <div className="space-y-3">
            {recentPurchases.map((purchase, idx) => (
              <div key={idx} className="bg-white border p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-700">Compra en {purchase.store}</p>
                  <p className="text-sm text-gray-500">{purchase.date}</p>
                </div>
                <span className="font-bold text-gray-900">{formatCurrency(purchase.amount)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Promotions Section */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
            <Tag className="text-gray-500 mr-2" size={20} />
            Promociones Vigentes
          </h2>
          <div className="space-y-3">
            {promotions.map((promo, idx) => (
              <div key={idx} className="bg-white border p-4 rounded-lg">
                <p className="font-semibold text-gray-700">{promo.title}</p>
                <p className="text-sm text-gray-500 mt-1">{promo.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
