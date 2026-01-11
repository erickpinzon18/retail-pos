import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getById, getAll } from '../api/firestoreService';

const StoreContext = createContext(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [currentStore, setCurrentStore] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoreData = async () => {
      if (!user) {
        setCurrentStore(null);
        setAllStores([]);
        setLoading(false);
        return;
      }

      try {
        if (isAdmin) {
          // Admin can see all stores
          const stores = await getAll('stores');
          setAllStores(stores);
          // Set first store as default if available
          if (stores.length > 0) {
            setCurrentStore(stores[0]);
          }
        } else if (user.storeId) {
          // Seller only sees their assigned store
          const store = await getById('stores', user.storeId);
          if (store) {
            setCurrentStore(store);
            setAllStores([store]);
          }
        }
      } catch (error) {
        console.error('Error loading store data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, [user, isAdmin]);

  const selectStore = (store) => {
    if (isAdmin) {
      setCurrentStore(store);
    }
  };

  const value = {
    currentStore,
    allStores,
    loading,
    selectStore,
    storeId: currentStore?.id
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};
