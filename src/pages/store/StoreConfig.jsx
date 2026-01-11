import { useState } from 'react';
import Card, { CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function StoreConfig() {
  const [address, setAddress] = useState('Av. Principal #123');
  const [phone, setPhone] = useState('123-456-7890');
  const [ticketFooter, setTicketFooter] = useState('¡Gracias por su compra!');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-500 mt-1">Personaliza tu entorno de trabajo y dispositivos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Store Info */}
          <Card>
            <CardTitle className="mb-4">Información de la Tienda</CardTitle>
            <div className="space-y-4">
              <Input
                label="Dirección (Calle y Número)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Input
                label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </Card>

          {/* Devices */}
          <Card>
            <CardTitle className="mb-4">Dispositivos y Hardware</CardTitle>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Impresora de Tickets</span>
                <select className="w-1/2 border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500">
                  <option>Epson TM-T20II (Predeterminada)</option>
                  <option>Star TSP100</option>
                  <option>No imprimir</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Escáner de Código de Barras</span>
                <Badge variant="success" size="lg">Conectado</Badge>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card>
            <CardTitle className="mb-4">Seguridad</CardTitle>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">PIN de Acceso</span>
              <Button>Cambiar PIN</Button>
            </div>
          </Card>
        </div>

        {/* Ticket Preview Column */}
        <div className="lg:col-span-1">
          <Card>
            <CardTitle className="mb-4">Personalizar Ticket</CardTitle>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje de Agradecimiento
              </label>
              <input
                type="text"
                value={ticketFooter}
                onChange={(e) => setTicketFooter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <h3 className="font-semibold text-center mb-2 mt-6">Vista Previa</h3>
            <div className="bg-gray-50 p-4 border-dashed border-2 border-gray-300 font-mono text-xs text-gray-800">
              <p className="text-center font-bold">** Mi Tienda **</p>
              <p className="text-center">{address}</p>
              <p className="text-center">Tel: {phone}</p>
              <hr className="border-dashed border-gray-400 my-2" />
              <p>Cajero: Ana García</p>
              <p>Fecha: 07/10/2025 16:25</p>
              <hr className="border-dashed border-gray-400 my-2" />
              <div className="flex justify-between">
                <span>1x Camisa Casual</span>
                <span>$299.99</span>
              </div>
              <div className="flex justify-between">
                <span>2x Pantalón</span>
                <span>$1099.00</span>
              </div>
              <hr className="border-dashed border-gray-400 my-2" />
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>$1,398.99</span>
              </div>
              <hr className="border-dashed border-gray-400 my-2" />
              <p className="text-center mt-2">{ticketFooter}</p>
            </div>

            <Button className="w-full mt-4">Guardar Cambios</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
