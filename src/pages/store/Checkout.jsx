import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Building2, QrCode, Tag, X, UserPlus, Star, Users, Package, Clock } from 'lucide-react';
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
  getAll,
  create,
  update,
  createSale,
  updateProductStock,
  addClientPurchase,
  getClientMonthlyTotal,
  createApartado
} from '../../api/firestoreService';

const VIP_THRESHOLD = 2000;
const VIP_DISCOUNT = 15;
const MIN_DEPOSIT_PERCENT = 10;

export default function Checkout() {
  const { user } = useAuth();
  const { storeId, storeName } = useStore();
  const searchInputRef = useRef(null);
  const clientSearchRef = useRef(null);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [promotions, setPromotions] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  // Client search states
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [showClientResults, setShowClientResults] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '' });

  // Apartado states
  const [showApartadoModal, setShowApartadoModal] = useState(false);
  const [apartadoDeposit, setApartadoDeposit] = useState('');
  const [apartadoNotes, setApartadoNotes] = useState('');
  const [processingApartado, setProcessingApartado] = useState(false);

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
        const [productsData, categoriesData, promotionsData, storeData, clientsData] = await Promise.all([
          getAllProducts(),
          getProductCategories(),
          getActivePromotions(storeId),
          storeId ? getById('stores', storeId) : null,
          getAll('clients')
        ]);
        setProducts(productsData);
        setCategories(['Todos', ...categoriesData]);
        setPromotions(promotionsData);
        setStoreConfig(storeData);
        setClients(clientsData);
        
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

  // Client search
  useEffect(() => {
    if (clientSearch.trim().length >= 2) {
      const term = clientSearch.toLowerCase();
      const results = clients.filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.clientId?.includes(term)
      ).slice(0, 5);
      setClientResults(results);
      setShowClientResults(true);
    } else {
      setClientResults([]);
      setShowClientResults(false);
    }
  }, [clientSearch, clients]);

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

  // Handle client ID scan
  const handleClientSearch = (e) => {
    if (e.key === 'Enter' && clientSearch.trim()) {
      e.preventDefault();
      
      // Find client by exact ID match
      const client = clients.find(c => 
        c.clientId === clientSearch.trim()
      );
      
      if (client) {
        selectClient(client);
      }
    }
  };

  const selectClient = async (client) => {
    try {
      // Get real monthly total from purchases subcollection
      const monthlyTotal = await getClientMonthlyTotal(client.id);
      const clientIsVip = monthlyTotal >= VIP_THRESHOLD;
      
      setCustomerInfo({
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        phone: client.phone,
        isVip: clientIsVip,
        monthlyPurchases: monthlyTotal
      });
      setClientSearch('');
      setShowClientResults(false);
    } catch (error) {
      console.error('Error getting client data:', error);
      // Use basic info if error
      setCustomerInfo({
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        phone: client.phone,
        isVip: false,
        monthlyPurchases: 0
      });
      setClientSearch('');
      setShowClientResults(false);
    }
  };

  // Generate unique 5-digit client ID
  const generateClientId = () => {
    const existingIds = clients.map(c => c.clientId);
    let newId;
    do {
      newId = Math.floor(10000 + Math.random() * 90000).toString();
    } while (existingIds.includes(newId));
    return newId;
  };

  // Quick register new client
  const handleQuickRegister = async () => {
    if (!newClientData.name.trim() || !newClientData.phone.trim()) {
      alert('Nombre y teléfono son requeridos');
      return;
    }

    try {
      setSavingClient(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const clientId = generateClientId();
      
      const newClient = await create('clients', {
        clientId,
        name: newClientData.name.trim(),
        phone: newClientData.phone.trim(),
        email: '',
        notes: '',
        monthlyPurchases: 0,
        totalPurchases: 0,
        lastPurchaseMonth: currentMonth,
        createdAt: new Date(),
        registeredBy: user?.uid || null,
        registeredByName: user?.name || 'Desconocido',
        registeredAtStoreId: storeId || null,
        registeredAtStoreName: storeName || 'Desconocida'
      });

      // Refresh clients list
      const updatedClients = await getAll('clients');
      setClients(updatedClients);

      // Auto-select the new client
      const createdClient = updatedClients.find(c => c.clientId === clientId);
      if (createdClient) {
        selectClient(createdClient);
      }

      setShowClientModal(false);
      setNewClientData({ name: '', phone: '' });
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error al registrar cliente');
    } finally {
      setSavingClient(false);
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
  const vipDiscount = customerInfo?.isVip ? (subtotal - promoDiscount) * (VIP_DISCOUNT / 100) : 0;
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
    setClientSearch('');
  };

  const finalizeSale = async () => {
    try {
      setProcessing(true);
      
      const saleData = {
        storeId: storeId,
        storeName: storeName || storeConfig?.name || 'Tienda',
        userId: user?.uid || null,
        userName: user?.name || 'Cajero',
        customerId: customerInfo?.id || 'mostrador',
        customerClientId: customerInfo?.clientId || null,
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
        // Hidden 4% card commission - not shown to customer/seller
        cardCommission: paymentMethod === 'card' ? Math.round(total * 0.04 * 100) / 100 : 0,
      };
      
      await createSale(saleData);
      
      // Update product stock
      for (const item of cart) {
        await updateProductStock(item.productId, item.quantity);
      }

      // Save purchase to client's subcollection if client selected
      if (customerInfo?.id && customerInfo.id !== 'mostrador') {
        await addClientPurchase(customerInfo.id, {
          storeId: storeId,
          storeName: storeName || storeConfig?.name || 'Tienda',
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
          sellerName: user?.name || 'Cajero'
        });
      }
      
      setShowCheckoutModal(false);
      clearCart();
      
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error al procesar la venta. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Apartado creation
  const handleApartado = async () => {
    if (!customerInfo || customerInfo.id === 'mostrador') {
      alert('Debes seleccionar un cliente para crear un apartado');
      return;
    }
    
    const depositAmount = parseFloat(apartadoDeposit) || 0;
    const minDeposit = Math.ceil(total * (MIN_DEPOSIT_PERCENT / 100));
    
    if (depositAmount < minDeposit) {
      alert(`El anticipo mínimo es ${formatCurrency(minDeposit)} (${MIN_DEPOSIT_PERCENT}% del total)`);
      return;
    }
    
    try {
      setProcessingApartado(true);
      
      const apartadoData = {
        clientId: customerInfo.id,
        clientClientId: customerInfo.clientId,
        clientName: customerInfo.name,
        clientPhone: customerInfo.phone,
        items: cartWithDiscounts.map(item => ({
          productId: item.productId,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          promoDiscount: item.promoDiscount || 0,
          finalPrice: item.finalPrice
        })),
        total,
        depositPaid: depositAmount,
        paymentMethod: 'cash',
        createdBy: user?.uid,
        createdByName: user?.name || 'Vendedor',
        storeName: storeName || storeConfig?.name || 'Tienda',
        notes: apartadoNotes.trim()
      };
      
      const result = await createApartado(storeId, apartadoData);
      
      alert(`✅ Apartado creado exitosamente!\n\nNúmero: ${result.apartadoNumber}\nCliente: ${customerInfo.name}\nAnticipo: ${formatCurrency(depositAmount)}\nRestante: ${formatCurrency(result.remainingBalance)}\n\nVence en 15 días.`);
      
      setShowApartadoModal(false);
      setApartadoDeposit('');
      setApartadoNotes('');
      clearCart();
      
    } catch (error) {
      console.error('Error creating apartado:', error);
      alert('Error al crear apartado. Intenta de nuevo.');
    } finally {
      setProcessingApartado(false);
    }
  };

  const openApartadoModal = () => {
    if (!customerInfo || customerInfo.id === 'mostrador') {
      alert('Debes seleccionar un cliente para crear un apartado');
      return;
    }
    const minDeposit = Math.ceil(total * (MIN_DEPOSIT_PERCENT / 100));
    setApartadoDeposit(minDeposit.toString());
    setShowApartadoModal(true);
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

        {/* Client Selection - Quick Access */}
        <div className="bg-gray-50 p-3 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Users size={14} />
              Cliente
            </span>
            <button 
              onClick={() => setShowClientModal(true)}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <UserPlus size={12} />
              Nuevo
            </button>
          </div>
          
          {customerInfo ? (
            <div className={`p-3 rounded-lg border-2 ${customerInfo.isVip ? 'bg-yellow-50 border-yellow-300' : 'bg-indigo-50 border-indigo-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{customerInfo.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono bg-white px-2 py-0.5 rounded">#{customerInfo.clientId}</span>
                    {customerInfo.isVip && (
                      <Badge variant="warning">⭐ VIP -{VIP_DISCOUNT}%</Badge>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setCustomerInfo(null)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                ref={clientSearchRef}
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                onKeyDown={handleClientSearch}
                placeholder="Buscar por ID, nombre o tel..."
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              {showClientResults && clientResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10 max-h-48 overflow-y-auto">
                  {clientResults.map(client => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{client.name}</p>
                        <p className="text-xs text-gray-500">#{client.clientId} • {client.phone}</p>
                      </div>
                      {(client.monthlyPurchases || 0) >= VIP_THRESHOLD && (
                        <Star size={14} className="text-yellow-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
            <div className="flex justify-between text-sm text-yellow-600">
              <span className="flex items-center gap-1">
                <Star size={12} />
                Descuento VIP (-{VIP_DISCOUNT}%)
              </span>
              <span>-{formatCurrency(vipDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="py-3 px-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={openApartadoModal}
            disabled={cart.length === 0 || !customerInfo}
            className="py-3 px-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
            title={!customerInfo ? 'Selecciona un cliente primero' : ''}
          >
            <Package size={16} />
            Apartar
          </button>
          <button
            onClick={() => setShowCheckoutModal(true)}
            disabled={cart.length === 0}
            className="py-3 px-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Cobrar
          </button>
        </div>
      </section>

      {/* Quick Register Client Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title="Registrar Cliente Rápido"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newClientData.name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              placeholder="Nombre del cliente"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500"
              placeholder="427-123-4567"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setShowClientModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleQuickRegister}
              disabled={savingClient}
            >
              {savingClient ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>

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
          {customerInfo?.isVip && (
            <p className="text-yellow-300 text-sm mt-1">⭐ Cliente VIP - {VIP_DISCOUNT}% descuento aplicado</p>
          )}
        </div>

        {/* Customer Section */}
        {customerInfo && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${customerInfo.isVip ? 'bg-yellow-50 border-yellow-200' : 'bg-indigo-50 border-indigo-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{customerInfo.name}</p>
                <p className="text-sm text-gray-500">#{customerInfo.clientId} • {customerInfo.phone}</p>
              </div>
              {customerInfo.isVip && (
                <Badge variant="warning">⭐ VIP</Badge>
              )}
            </div>
          </div>
        )}

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

      {/* Apartado Modal */}
      <Modal
        isOpen={showApartadoModal}
        onClose={() => setShowApartadoModal(false)}
        title="Crear Apartado"
        size="md"
      >
        <div className="space-y-4">
          {/* Client Info */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Package size={18} className="text-orange-600" />
              <span className="font-bold text-gray-800">Apartado para:</span>
            </div>
            <p className="font-bold text-gray-800">{customerInfo?.name}</p>
            <p className="text-sm text-gray-500">#{customerInfo?.clientId} • {customerInfo?.phone}</p>
          </div>

          {/* Products Summary */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-sm text-gray-500 mb-2">{cart.length} producto(s)</p>
            <div className="flex justify-between font-bold">
              <span>Total a Apartar:</span>
              <span className="text-lg text-gray-800">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Deposit Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anticipo <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 ml-1">(mínimo {MIN_DEPOSIT_PERCENT}% = {formatCurrency(Math.ceil(total * (MIN_DEPOSIT_PERCENT / 100)))})</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min={Math.ceil(total * (MIN_DEPOSIT_PERCENT / 100))}
                max={total}
                value={apartadoDeposit}
                onChange={(e) => setApartadoDeposit(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-lg font-bold"
                placeholder={Math.ceil(total * (MIN_DEPOSIT_PERCENT / 100)).toString()}
              />
            </div>
          </div>

          {/* Balance Preview */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Anticipo:</span>
              <span className="font-bold text-green-600">{formatCurrency(parseFloat(apartadoDeposit) || 0)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-gray-700">Restante a pagar:</span>
              <span className="text-lg text-orange-600">
                {formatCurrency(Math.max(0, total - (parseFloat(apartadoDeposit) || 0)))}
              </span>
            </div>
          </div>

          {/* Due Date Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
            <Clock size={16} />
            <span>El apartado vence en <strong>15 días</strong></span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={apartadoNotes}
              onChange={(e) => setApartadoNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Ej: Cliente paga cada viernes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setShowApartadoModal(false)}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button 
              onClick={handleApartado}
              disabled={processingApartado || !apartadoDeposit || parseFloat(apartadoDeposit) < Math.ceil(total * (MIN_DEPOSIT_PERCENT / 100))}
              className="flex-1 py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Package size={18} />
              {processingApartado ? 'Creando...' : 'Crear Apartado'}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
