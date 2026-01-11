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
 * Get today's date string for document ID
 */
const getDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
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
