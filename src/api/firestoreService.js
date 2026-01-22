import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

// Generic CRUD operations

export const getAll = async (collectionName) => {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getById = async (collectionName, id) => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const create = async (collectionName, data) => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const update = async (collectionName, id, data) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

export const remove = async (collectionName, id) => {
  await deleteDoc(doc(db, collectionName, id));
};

// =====================
// SESSION LOGGING
// =====================

/**
 * Log user session start with metadata
 * Requests geolocation permission - required for login
 */
/**
 * Log user session start with metadata
 * Requests geolocation permission - required for login
 */
export const logSessionStart = async (userProfile, status = 'success', failureReason = null) => {
  try {
    // Request geolocation permission (MANDATORY)
    const position = await new Promise((resolve, reject) => {
      // ... same permission logic, simplified for brevity in replacement ...
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible en este navegador'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          let message = 'Debe permitir el acceso a su ubicación para iniciar sesión.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Permiso de ubicación denegado. Debe permitir el acceso para continuar.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Ubicación no disponible. Verifique su GPS.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Tiempo de espera agotado. Intente nuevamente.';
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
    
    // Collect device and browser information
    const sessionData = {
      userId: userProfile.uid,
      userName: userProfile.name || 'Unknown',
      userEmail: userProfile.email || '',
      userRole: userProfile.role || 'seller',
      userType: userProfile.type || null,
      storeId: userProfile.storeId || null,
      timestamp: Timestamp.now(),
      status, // 'success' or 'failed'
      failureReason, // null or string reason
      
      // Exact GPS location
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, // meters
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed
      },
      
      // Browser/Device info
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Will be populated with IP
      ipAddress: null,
      ipLocation: null // Keep IP location separate from GPS location
    };
    
    // Try to get IP address from external API (non-blocking)
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      sessionData.ipAddress = data.ip;
      
      // Try to get location from IP for comparison
      try {
        const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`);
        const geoData = await geoResponse.json();
        sessionData.ipLocation = {
          city: geoData.city,
          region: geoData.region,
          country: geoData.country_name
        };
      } catch (geoError) {
        console.warn('Could not fetch IP geolocation:', geoError);
      }
    } catch (ipError) {
      console.warn('Could not fetch IP address:', ipError);
    }
    
    // Store session log
    await addDoc(collection(db, 'sessionLogs'), sessionData);
    
    return sessionData;
  } catch (error) {
    // For geolocation errors, we MUST throw - it's mandatory
    if (error.message && error.message.includes('ubicación')) {
      throw error;
    }
    console.error('Error logging session:', error);
    throw new Error('Error al registrar la sesión. Intente nuevamente.');
  }
};

// =====================
// SUPER TOKEN SYSTEM
// =====================

/**
 * Generate a new super token for returns
 * Valid for 5 minutes
 */
export const generateSuperToken = async (adminUser) => {
  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 5);
  
  const tokenData = {
    code,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expirationDate),
    createdBy: {
      uid: adminUser.uid,
      name: adminUser.name || 'Admin',
      email: adminUser.email
    },
    status: 'active',
    type: 'return'
  };
  
  await addDoc(collection(db, 'tokens'), tokenData);
  return tokenData;
};

/**
 * Validate and mark token as used
 */
export const validateAndUseToken = async (code, user) => {
  const q = query(
    collection(db, 'tokens'),
    where('code', '==', code),
    where('status', '==', 'active'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error('Token inválido o expirado');
  }
  
  const tokenDoc = snapshot.docs[0];
  const tokenData = tokenDoc.data();
  
  // Check expiration
  const now = new Date();
  const expiresAt = tokenData.expiresAt.toDate();
  
  if (now > expiresAt) {
    await updateDoc(doc(db, 'tokens', tokenDoc.id), { status: 'expired' });
    throw new Error('El token ha expirado. Solicite uno nuevo.');
  }
  
  // Mark as used
  await updateDoc(doc(db, 'tokens', tokenDoc.id), {
    status: 'used',
    usedBy: {
      uid: user.uid,
      name: user.name || 'Usuario',
      email: user.email
    },
    usedAt: Timestamp.now()
  });
  
  return { id: tokenDoc.id, ...tokenData };
};

/**
 * Process a full return for a sale
 */
export const processReturn = async (sale, tokenUsed, user) => {
  // 1. Update Sale
  const saleRef = doc(db, 'sales', sale.id);
  await updateDoc(saleRef, {
    status: 'returned',
    returnMetadata: {
      returnedAt: Timestamp.now(),
      returnedBy: {
        uid: user.uid,
        name: user.name
      },
      authorizedBy: tokenUsed.createdBy, // Admin who generated token
      tokenCode: tokenUsed.code,
      reason: 'Devolución autorizada'
    }
  });
  
  // 2. Return items to inventory
  for (const item of (sale.items || [])) {
    if (item.productId) {
      const productRef = doc(db, 'products', item.productId);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const currentStock = productDoc.data().currentStock || 0;
        await updateDoc(productRef, {
          currentStock: currentStock + (item.quantity || 1)
        });
      }
    }
  }
  
  // 3. Create negative transaction for cash adjustment if needed
  // This logic is handled by sales status in reports usually, 
  // but if you have a separate transactions collection, add it here.
  // For now, reports should filter out 'returned' status or handle negative values.
  
  return true;
};

// Query helpers

export const getByStoreId = async (collectionName, storeId) => {
  const q = query(
    collection(db, collectionName),
    where('storeId', '==', storeId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSalesByStore = async (storeId) => {
  const q = query(
    collection(db, 'sales'),
    where('storeId', '==', storeId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSalesByDateRange = async (storeId, startDate, endDate) => {
  const q = query(
    collection(db, 'sales'),
    where('storeId', '==', storeId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSalesByDayType = async (storeId, dayType) => {
  const q = query(
    collection(db, 'sales'),
    where('storeId', '==', storeId),
    where('dayType', '==', dayType)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUsersByStore = async (storeId) => {
  const q = query(
    collection(db, 'users'),
    where('storeId', '==', storeId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getActivePromotions = async (storeId = null) => {
  // Get all active promotions
  const q = query(
    collection(db, 'promotions'),
    where('status', '==', true)
  );
  
  const snapshot = await getDocs(q);
  const now = new Date();
  
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(promo => {
      // Check if promotion hasn't expired
      if (promo.finishAt) {
        const finishDate = promo.finishAt.toDate ? promo.finishAt.toDate() : new Date(promo.finishAt);
        if (now > finishDate) return false;
      }
      
      // Check if promotion applies to this store
      if (storeId && promo.storeIds && promo.storeIds.length > 0) {
        return promo.storeIds.includes(storeId);
      }
      
      return true; // Global promotion or no storeIds restriction
    });
};

export const getApartadosByCustomer = async (customerId) => {
  const q = query(
    collection(db, 'apartados'),
    where('customerId', '==', customerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPendingApartados = async (storeId) => {
  const q = query(
    collection(db, 'apartados'),
    where('storeId', '==', storeId),
    where('status', 'in', ['active', 'expired'])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// =====================
// PRODUCTS
// =====================

// Get all products (shared across all stores)
export const getAllProducts = async () => {
  const q = query(
    collection(db, 'products'),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get products by category
export const getProductsByCategory = async (category) => {
  const q = query(
    collection(db, 'products'),
    where('category', '==', category),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get all unique categories
export const getProductCategories = async () => {
  const products = await getAllProducts();
  const categories = [...new Set(products.map(p => p.category))];
  return categories.filter(Boolean).sort();
};

// Search products by name or SKU
export const searchProducts = async (searchTerm) => {
  // Note: Firestore doesn't support native text search
  // For production, consider Algolia or similar
  const products = await getAllProducts();
  const term = searchTerm.toLowerCase();
  return products.filter(p => 
    p.name?.toLowerCase().includes(term) || 
    p.sku?.toLowerCase().includes(term)
  );
};

// Update product stock
export const updateProductStock = async (productId, quantitySold) => {
  const product = await getById('products', productId);
  if (product && product.stock !== undefined) {
    await update('products', productId, {
      stock: Math.max(0, product.stock - quantitySold)
    });
  }
};

// =====================
// SALES (with denormalized product data)
// =====================

// Create a sale with dayType calculation and denormalized product data
// Each item in items[] should have: { productId, name, category, price, quantity }
export const createSale = async (saleData) => {
  const today = new Date().getDay();
  const dayType = (today === 0 || today === 6) ? 'weekend' : 'weekday';
  
  // Items are already denormalized from the cart:
  // items: [{ productId, name, category, price, quantity }]
  
  return await create('sales', {
    ...saleData,
    dayType,
    date: Timestamp.now()
  });
};

// Get sales with category breakdown (for statistics)
export const getSalesWithCategoryStats = async (storeId, startDate, endDate) => {
  const sales = await getSalesByDateRange(storeId, startDate, endDate);
  
  // Aggregate by category
  const categoryStats = {};
  sales.forEach(sale => {
    sale.items?.forEach(item => {
      const cat = item.category || 'Sin Categoría';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { totalSales: 0, quantity: 0 };
      }
      categoryStats[cat].totalSales += item.price * item.quantity;
      categoryStats[cat].quantity += item.quantity;
    });
  });
  
  return categoryStats;
};

// Get top selling products (using denormalized data)
export const getTopSellingProducts = async (storeId, startDate, endDate, topN = 5) => {
  const sales = await getSalesByDateRange(storeId, startDate, endDate);
  
  // Aggregate by productId
  const productStats = {};
  sales.forEach(sale => {
    sale.items?.forEach(item => {
      const pid = item.productId;
      if (!productStats[pid]) {
        productStats[pid] = { 
          productId: pid, 
          name: item.name, 
          category: item.category,
          quantity: 0, 
          revenue: 0 
        };
      }
      productStats[pid].quantity += item.quantity;
      productStats[pid].revenue += item.price * item.quantity;
    });
  });
  
  // Sort by quantity and return top N
  return Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, topN);
};

// Cash Close Functions - Subcollection: stores/{storeId}/cashCloses/{dateString}

/**
 * Get today's date string for document ID using local timezone
 */
const getDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
};

/**
 * Get cash closes for today from store subcollection
 */
export const getTodayCashCloses = async (storeId) => {
  const dateString = getDateString();
  const docRef = doc(db, 'stores', storeId, 'cashCloses', dateString);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data().closes || [];
  }
  return [];
};

/**
 * Add a cash close to today's document (stores/{storeId}/cashCloses/{YYYY-MM-DD})
 * Creates the document if it doesn't exist, otherwise appends to closes array
 */
export const addCashClose = async (storeId, closeData) => {
  const dateString = getDateString();
  const docRef = doc(db, 'stores', storeId, 'cashCloses', dateString);
  
  const closeEntry = {
    ...closeData,
    id: `close_${Date.now()}`,
    createdAt: Timestamp.now()
  };
  
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    // Append to existing array
    await updateDoc(docRef, {
      closes: arrayUnion(closeEntry),
      updatedAt: Timestamp.now()
    });
  } else {
    // Create new document
    await setDoc(docRef, {
      date: dateString,
      storeId,
      closes: [closeEntry],
      createdAt: Timestamp.now()
    });
  }
  
  return closeEntry;
};

/**
 * Get cash close history for a store (last N days)
 */
export const getCashCloseHistory = async (storeId, days = 7) => {
  const history = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = getDateString(date);
    
    const docRef = doc(db, 'stores', storeId, 'cashCloses', dateString);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      history.push({
        date: dateString,
        ...docSnap.data()
      });
    }
  }
  
  return history;
};

/**
 * Get cash closes for a specific date
 */
export const getCashClosesForDate = async (storeId, date) => {
  const dateString = typeof date === 'string' ? date : getDateString(date);
  const docRef = doc(db, 'stores', storeId, 'cashCloses', dateString);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data().closes || [];
  }
  return [];
};

// ============================================
// Client Purchase Functions - Subcollection: clients/{clientId}/purchases
// ============================================

/**
 * Add a purchase to client's purchase history
 */
export const addClientPurchase = async (clientId, purchaseData) => {
  const purchaseRef = collection(db, 'clients', clientId, 'purchases');
  
  const purchase = {
    ...purchaseData,
    createdAt: Timestamp.now()
  };
  
  const docRef = await addDoc(purchaseRef, purchase);
  return { id: docRef.id, ...purchase };
};

/**
 * Get all purchases for a client
 */
export const getClientPurchases = async (clientId) => {
  const purchasesRef = collection(db, 'clients', clientId, 'purchases');
  const q = query(purchasesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get client purchases for current month
 */
export const getClientMonthlyPurchases = async (clientId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const purchasesRef = collection(db, 'clients', clientId, 'purchases');
  const q = query(
    purchasesRef, 
    where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Calculate client's monthly total from purchases
 */
export const getClientMonthlyTotal = async (clientId) => {
  const purchases = await getClientMonthlyPurchases(clientId);
  return purchases.reduce((sum, p) => sum + (p.total || 0), 0);
};

/**
 * Get client purchases within a date range
 */
export const getClientPurchasesByDateRange = async (clientId, startDate, endDate) => {
  const purchasesRef = collection(db, 'clients', clientId, 'purchases');
  const q = query(
    purchasesRef, 
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Calculate client's total from purchases within a date range
 */
export const getClientTotalByDateRange = async (clientId, startDate, endDate) => {
  const purchases = await getClientPurchasesByDateRange(clientId, startDate, endDate);
  return purchases.reduce((sum, p) => sum + (p.total || 0), 0);
};

// ============================================
// Apartados (Layaway) Functions - Subcollection: stores/{storeId}/apartados
// ============================================

const APARTADO_DAYS_LIMIT = 15;
const APARTADO_MIN_DEPOSIT_PERCENT = 10;

/**
 * Get next sequential apartado number for a store
 */
export const getNextApartadoNumber = async (storeId) => {
  const apartadosRef = collection(db, 'stores', storeId, 'apartados');
  const snapshot = await getDocs(apartadosRef);
  const count = snapshot.size + 1;
  return `APT-${count.toString().padStart(4, '0')}`;
};

/**
 * Create a new apartado
 */
export const createApartado = async (storeId, data) => {
  const apartadoNumber = await getNextApartadoNumber(storeId);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + APARTADO_DAYS_LIMIT);
  
  const apartadoData = {
    apartadoNumber,
    status: 'active', // active, completed, cancelled, expired
    
    // Client info
    clientId: data.clientId,
    clientClientId: data.clientClientId,
    clientName: data.clientName,
    clientPhone: data.clientPhone || '',
    
    // Products
    items: data.items || [],
    
    // Financials
    total: data.total,
    depositRequired: Math.ceil(data.total * (APARTADO_MIN_DEPOSIT_PERCENT / 100)),
    depositPaid: data.depositPaid || 0,
    remainingBalance: data.total - (data.depositPaid || 0),
    
    // Payments history
    payments: data.depositPaid > 0 ? [{
      amount: data.depositPaid,
      date: Timestamp.now(),
      paymentMethod: data.paymentMethod || 'cash',
      receivedBy: data.createdBy,
      receivedByName: data.createdByName
    }] : [],
    
    // Dates
    createdAt: Timestamp.now(),
    dueDate: Timestamp.fromDate(dueDate),
    completedAt: null,
    
    // Tracking
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    storeId: storeId,
    storeName: data.storeName || '',
    
    notes: data.notes || ''
  };
  
  const apartadosRef = collection(db, 'stores', storeId, 'apartados');
  const docRef = await addDoc(apartadosRef, apartadoData);
  
  // If deposit was paid, create a sale record for cash tracking
  if (data.depositPaid > 0) {
    await createSale({
      storeId: storeId,
      items: [{
        name: `Anticipo Apartado ${apartadoNumber}`,
        price: data.depositPaid,
        quantity: 1,
        category: 'Apartado'
      }],
      total: data.depositPaid,
      paymentMethod: data.paymentMethod || 'cash',
      userId: data.createdBy,
      userName: data.createdByName,
      customerName: data.clientName,
      type: 'apartado_deposit',
      apartadoId: docRef.id,
      apartadoNumber: apartadoNumber
    });
  }
  
  return { id: docRef.id, ...apartadoData };
};

/**
 * Get all apartados for a store
 */
export const getApartados = async (storeId) => {
  const apartadosRef = collection(db, 'stores', storeId, 'apartados');
  const q = query(apartadosRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get apartados by status
 */
export const getApartadosByStatus = async (storeId, status) => {
  const apartadosRef = collection(db, 'stores', storeId, 'apartados');
  const q = query(apartadosRef, where('status', '==', status), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get single apartado by ID
 */
export const getApartadoById = async (storeId, apartadoId) => {
  const docRef = doc(db, 'stores', storeId, 'apartados', apartadoId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * Add payment to apartado
 */
export const addApartadoPayment = async (storeId, apartadoId, payment) => {
  const apartado = await getApartadoById(storeId, apartadoId);
  if (!apartado) throw new Error('Apartado not found');
  
  const newPayment = {
    amount: payment.amount,
    date: Timestamp.now(),
    paymentMethod: payment.paymentMethod || 'cash',
    receivedBy: payment.receivedBy,
    receivedByName: payment.receivedByName
  };
  
  const newRemainingBalance = apartado.remainingBalance - payment.amount;
  const newDepositPaid = apartado.depositPaid + payment.amount;
  
  const updates = {
    payments: arrayUnion(newPayment),
    depositPaid: newDepositPaid,
    remainingBalance: Math.max(0, newRemainingBalance),
    updatedAt: Timestamp.now()
  };
  
  // Auto-complete if fully paid
  if (newRemainingBalance <= 0) {
    updates.status = 'completed';
    updates.completedAt = Timestamp.now();
  }
  
  const docRef = doc(db, 'stores', storeId, 'apartados', apartadoId);
  await updateDoc(docRef, updates);
  
  // Create a sale record for this payment (cash tracking)
  const saleType = newRemainingBalance <= 0 ? 'apartado_complete' : 'apartado_payment';
  await createSale({
    storeId: storeId,
    items: [{
      name: newRemainingBalance <= 0 
        ? `Liquidación Apartado ${apartado.apartadoNumber}`
        : `Abono Apartado ${apartado.apartadoNumber}`,
      price: payment.amount,
      quantity: 1,
      category: 'Apartado'
    }],
    total: payment.amount,
    paymentMethod: payment.paymentMethod || 'cash',
    userId: payment.receivedBy,
    userName: payment.receivedByName,
    customerName: apartado.clientName,
    type: saleType,
    apartadoId: apartadoId,
    apartadoNumber: apartado.apartadoNumber
  });
  
  return { ...apartado, ...updates, payments: [...apartado.payments, newPayment] };
};

/**
 * Update apartado
 */
export const updateApartado = async (storeId, apartadoId, data) => {
  const docRef = doc(db, 'stores', storeId, 'apartados', apartadoId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

/**
 * Complete apartado (mark as picked up)
 */
export const completeApartado = async (storeId, apartadoId) => {
  const docRef = doc(db, 'stores', storeId, 'apartados', apartadoId);
  await updateDoc(docRef, {
    status: 'completed',
    completedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
};

/**
 * Cancel apartado
 */
export const cancelApartado = async (storeId, apartadoId, reason = '') => {
  const docRef = doc(db, 'stores', storeId, 'apartados', apartadoId);
  await updateDoc(docRef, {
    status: 'cancelled',
    cancelReason: reason,
    cancelledAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
};

/**
 * Check and update expired apartados
 */
export const checkExpiredApartados = async (storeId) => {
  const apartadosRef = collection(db, 'stores', storeId, 'apartados');
  const q = query(apartadosRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  
  const now = new Date();
  const expired = [];
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
    
    if (dueDate < now) {
      await updateDoc(docSnap.ref, {
        status: 'expired',
        updatedAt: Timestamp.now()
      });
      expired.push(docSnap.id);
    }
  }
  
  return expired;
};
