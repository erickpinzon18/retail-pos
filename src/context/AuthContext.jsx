import { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, getCurrentUserProfile, logout as authLogout } from '../api/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (authUser) => {
      try {
        if (authUser) {
          const profile = await getCurrentUserProfile(authUser.uid);
          setUser(profile || { uid: authUser.uid, email: authUser.email, role: 'seller' });
        } else {
          setUser(null);
        }
      } catch (err) {
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';

  const value = {
    user,
    loading,
    error,
    logout,
    isAdmin,
    isSeller,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
