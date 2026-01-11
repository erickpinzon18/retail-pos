import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Building2, QrCode, Tag, X } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { printSaleTicket } from '../../utils/printTicket';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { 
  getAllProducts, 
  getProductCategories, 
  getActivePromotions,
  getById,
  createSale,
  updateProductStock 
} from '../../api/firestoreService';

export default function Checkout() {
  const { user } = useAuth();
  const { storeId } = useStore();
  const searchInputRef = useRef(null);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [promotions, setPromotions] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  // Auto-focus on search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Re-focus after modal closes
  useEffect(() => {
    if (!showCheckoutModal && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showCheckoutModal]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData, promotionsData, storeData] = await Promise.all([
          getAllProducts(),
          getProductCategories(),
          getActivePromotions(storeId),
          storeId ? getById('stores', storeId) : null
        ]);
        setProducts(productsData);
        setCategories(['Todos', ...categoriesData]);
        setPromotions(promotionsData);
        setStoreConfig(storeData);
        
        // Set default payment method based on store config
        if (storeData?.paymentsAccepted) {
          if (storeData.paymentsAccepted.cash) setPaymentMethod('cash');
          else if (storeData.paymentsAccepted.card) setPaymentMethod('card');
          else if (storeData.paymentsAccepted.transfer) setPaymentMethod('transfer');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [storeId]);

  // Handle barcode scan (Enter key press)
  const handleScan = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      
      // Find product by exact SKU match
      const product = products.find(p => 
        p.sku?.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      
      if (product) {
        addToCart(product);
        setSearchTerm(''); // Clear input after adding
      }
    }
  };

  // Find applicable promotion for a product category
  const getPromotionForCategory = (category) => {
    return promotions.find(promo => 
      promo.type === 'percentage' && 
      promo.category === category
    );
  };

  // Calculate cart with promotions applied
  const cartWithDiscounts = useMemo(() => {
    return cart.map(item => {
      const promo = getPromotionForCategory(item.category);
      const promoDiscount = promo ? (item.price * item.quantity * promo.value / 100) : 0;
      return {
        ...item,
        promotion: promo,
        promoDiscount,
        finalPrice: (item.price * item.quantity) - promoDiscount
      };
    });
  }, [cart, promotions]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const promoDiscount = cartWithDiscounts.reduce((sum, item) => sum + item.promoDiscount, 0);
  const vipDiscount = customerInfo?.isVip ? (subtotal - promoDiscount) * 0.15 : 0;
  const total = subtotal - promoDiscount - vipDiscount;

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { 
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1 
      }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo(null);
    setCashReceived('');
  };

  const scanCustomer = () => {
    setCustomerInfo({
      id: 'CLT-00001234',
      name: 'Juan Pérez',
      isVip: true,
      points: 1250,
    });
  };

  const finalizeSale = async () => {
    try {
      setProcessing(true);
      
      const saleData = {
        storeId: storeId,
        userId: user?.uid,
        userName: user?.name || 'Cajero',
        customerId: customerInfo?.id || 'mostrador',
        customerName: customerInfo?.name || 'Cliente Mostrador',
        items: cartWithDiscounts.map(item => ({
          productId: item.productId,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          promoDiscount: item.promoDiscount || 0,
          finalPrice: item.finalPrice
        })),
        subtotal,
        promoDiscount,
        vipDiscount,
        total,
        paymentMethod,
      };
      
      await createSale(saleData);
      
      for (const item of cart) {
        await updateProductStock(item.productId, item.quantity);
      }
      
      setShowCheckoutModal(false);
      clearCart();
      // alert('¡Venta completada exitosamente!');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error al procesar la venta. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const change = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - total : 0;

  return (
    <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-y-auto">

      {/* Products Section */}
      <section className="col-span-12 lg:col-span-7 xl:col-span-8 bg-white p-6 rounded-xl shadow-lg flex flex-col">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Escanear código de barras o buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleScan}
            autoFocus
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>

        {/* Category Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-4 border-b border-gray-100">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition font-medium ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-500">Cargando productos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="h-20 bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
                    <span className="text-3xl font-bold text-indigo-300">
                      {product.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                    <p className="text-indigo-600 font-bold mt-1">{formatCurrency(product.price)}</p>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 transition ${
                        product.stock === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      <Plus size={16} />
                      {product.stock === 0 ? 'Agotado' : 'Agregar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cart Section */}
      <section className="col-span-12 lg:col-span-5 xl:col-span-4 bg-white p-6 rounded-xl shadow-lg flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Cuenta del Cliente</h2>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">🛒</div>
              <p>El carrito está vacío</p>
              <p className="text-sm">Agrega productos para comenzar</p>
            </div>
          ) : (
            cartWithDiscounts.map((item) => (
              <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${item.promotion ? 'text-gray-400 line-through' : 'text-indigo-600'}`}>
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    {item.promotion && (
                      <>
                        <p className="text-sm text-green-600 font-bold">{formatCurrency(item.finalPrice)}</p>
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Tag size={10} />
                          -{item.promotion.value}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary */}
        <div className="bg-gray-50 p-4 rounded-xl space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Tag size={12} />
                Promociones
              </span>
              <span>-{formatCurrency(promoDiscount)}</span>
            </div>
          )}
          {vipDiscount > 0 && (
            <div className="flex justify-between text-sm text-purple-600">
              <span>Descuento VIP (-15%)</span>
              <span>-{formatCurrency(vipDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={() => setShowCheckoutModal(true)}
            disabled={cart.length === 0}
            className="py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cobrar
          </button>
        </div>
      </section>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        title="Procesar Venta"
        size="lg"
      >
        {/* Total Section - Prominent at top */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-6 rounded-xl mb-6 shadow-lg">
          <p className="text-sm opacity-80">Total a Pagar</p>
          <p className="text-4xl font-extrabold">{formatCurrency(total)}</p>
        </div>

        {/* Customer Section */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Registrar Cliente (Opcional)</h3>
          {customerInfo ? (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-indigo-800">{customerInfo.name}</p>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Badge variant="warning">CLIENTE VIP</Badge>
                    <span className="text-green-600 font-semibold">-15% Descuento</span>
                  </div>
                </div>
                <button 
                  onClick={() => setCustomerInfo(null)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Quitar cliente"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escanea el QR o código de barras..."
                className="flex-1 border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button 
                onClick={scanCustomer}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2"
              >
                <QrCode size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Método de Pago</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'cash', label: 'Efectivo', icon: Banknote },
              { id: 'card', label: 'Tarjeta', icon: CreditCard },
              { id: 'transfer', label: 'Transferencia', icon: Building2 },
            ]
              .filter(({ id }) => !storeConfig?.paymentsAccepted || storeConfig.paymentsAccepted[id])
              .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPaymentMethod(id)}
                className={`p-4 border-2 rounded-xl flex flex-col items-center transition ${
                  paymentMethod === id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs mt-2 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cash Input */}
        {paymentMethod === 'cash' && (
          <div className="mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo Recibido</label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="$0.00"
                className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
            </div>
            {change > 0 && (
              <div className="bg-green-50 text-green-800 p-4 rounded-xl text-center border border-green-200">
                <p className="text-sm">Cambio</p>
                <p className="text-3xl font-bold">{formatCurrency(change)}</p>
              </div>
            )}
          </div>
        )}

        {/* Transfer Bank Details */}
        {paymentMethod === 'transfer' && storeConfig?.bank && (
          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-3">Datos para Transferencia</h4>
            <div className="space-y-2 text-sm">
              {storeConfig.bank.Bank && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Banco:</span>
                  <span className="font-semibold text-gray-800">{storeConfig.bank.Bank}</span>
                </div>
              )}
              {storeConfig.bank.CLABE && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CLABE:</span>
                  <span className="font-mono font-semibold text-gray-800">{storeConfig.bank.CLABE}</span>
                </div>
              )}
              {storeConfig.bank.Tarjeta && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tarjeta:</span>
                  <span className="font-mono font-semibold text-gray-800">{storeConfig.bank.Tarjeta}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => printSaleTicket({
              items: cartWithDiscounts,
              subtotal,
              promoDiscount,
              vipDiscount,
              total,
              paymentMethod,
              cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
              userName: user?.name || 'Cajero',
              customerName: customerInfo?.name || 'Cliente Mostrador',
              date: new Date()
            }, storeConfig)}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
          >
            Imprimir Ticket
          </button>
          <button 
            onClick={finalizeSale}
            disabled={processing}
            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
          >
            {processing ? 'Procesando...' : 'Finalizar Venta'}
          </button>
        </div>
      </Modal>
    </main>
  );
}
