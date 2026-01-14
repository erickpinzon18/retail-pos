import { useState, useEffect } from 'react';
import { Store, Save, Printer, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react';
import Card, { CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useStore } from '../../context/StoreContext';
import { getById, update } from '../../api/firestoreService';

export default function StoreConfig() {
  const { storeId, storeName } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeData, setStoreData] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    ticketFooter: '¡Gracias por su compra!',
    paymentsAccepted: {
      cash: true,
      card: true,
      transfer: true
    },
    bank: {
      Bank: '',
      CLABE: '',
      Tarjeta: ''
    }
  });

  useEffect(() => {
    const fetchStoreConfig = async () => {
      if (!storeId) return;
      
      try {
        setLoading(true);
        const data = await getById('stores', storeId);
        
        if (data) {
          setStoreData(data);
          setFormData({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            ticketFooter: data.ticketFooter || '¡Gracias por su compra!',
            paymentsAccepted: data.paymentsAccepted || { cash: true, card: true, transfer: true },
            bank: data.bank || { Bank: '', CLABE: '', Tarjeta: '' }
          });
        }
      } catch (error) {
        console.error('Error fetching store config:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreConfig();
  }, [storeId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await update('stores', storeId, formData);
      alert('Configuración guardada');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Cargando configuración...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
          <p className="text-gray-500 mt-1">Personaliza la tienda {storeName}</p>
        </div>
        <Button icon={<Save size={18} />} onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Info */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <Store size={20} className="text-indigo-600" />
              Información de la Tienda
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                  placeholder="55 1234 5678"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Calle, Número, Colonia"
                />
              </div>
            </div>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardTitle className="mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-indigo-600" />
              Métodos de Pago Aceptados
            </CardTitle>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handlePaymentToggle('cash')}
                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                  formData.paymentsAccepted.cash 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <Banknote size={28} className={formData.paymentsAccepted.cash ? 'text-green-600' : 'text-gray-400'} />
                <span className="font-medium">Efectivo</span>
                {formData.paymentsAccepted.cash && <Badge variant="success">Activo</Badge>}
              </button>
              <button
                type="button"
                onClick={() => handlePaymentToggle('card')}
                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                  formData.paymentsAccepted.card 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <CreditCard size={28} className={formData.paymentsAccepted.card ? 'text-blue-600' : 'text-gray-400'} />
                <span className="font-medium">Tarjeta</span>
                {formData.paymentsAccepted.card && <Badge variant="info">Activo</Badge>}
              </button>
              <button
                type="button"
                onClick={() => handlePaymentToggle('transfer')}
                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                  formData.paymentsAccepted.transfer 
                    ? 'border-yellow-500 bg-yellow-50' 
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <ArrowRightLeft size={28} className={formData.paymentsAccepted.transfer ? 'text-yellow-600' : 'text-gray-400'} />
                <span className="font-medium">Transferencia</span>
                {formData.paymentsAccepted.transfer && <Badge variant="warning">Activo</Badge>}
              </button>
            </div>
            
            {/* Bank Details */}
            {formData.paymentsAccepted.transfer && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Datos Bancarios (para transferencias)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Banco</label>
                    <input
                      type="text"
                      value={formData.bank.Bank}
                      onChange={(e) => handleBankChange('Bank', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="BBVA, Santander..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CLABE</label>
                    <input
                      type="text"
                      value={formData.bank.CLABE}
                      onChange={(e) => handleBankChange('CLABE', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="18 dígitos"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Número de Tarjeta</label>
                    <input
                      type="text"
                      value={formData.bank.Tarjeta}
                      onChange={(e) => handleBankChange('Tarjeta', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Devices - Disabled */}
          <Card className="opacity-60">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Printer size={20} className="text-gray-400" />
              Dispositivos
              <Badge variant="gray">Próximamente</Badge>
            </CardTitle>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Impresora de Tickets</span>
                <select disabled className="w-1/2 border border-gray-200 rounded-lg py-2 px-3 bg-gray-100 cursor-not-allowed">
                  <option>No configurada</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Escáner de Código de Barras</span>
                <Badge variant="gray">USB Automático</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Ticket Preview Column */}
        <div className="lg:col-span-1">
          <Card>
            <CardTitle className="mb-4">Vista Previa del Ticket</CardTitle>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje de Agradecimiento
              </label>
              <input
                type="text"
                value={formData.ticketFooter}
                onChange={(e) => handleChange('ticketFooter', e.target.value)}
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
                placeholder="¡Gracias por su compra!"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300 font-mono text-xs text-gray-800">
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
          </Card>
        </div>
      </div>
    </div>
  );
}
