import { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, getCurrentUserProfile, logout as authLogout, validateSchedule } from '../api/authService';

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
  const [scheduleStatus, setScheduleStatus] = useState(null);

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

  // Periodic schedule check (every minute)
  useEffect(() => {
    if (!user) {
      setScheduleStatus(null);
      return;
    }

    const checkSchedule = () => {
      const validation = validateSchedule(user);
      setScheduleStatus(validation);
      
      if (!validation.allowed) {
        // User is no longer allowed - auto logout
        console.warn('Schedule validation failed:', validation.message);
        logout();
        alert(validation.message + ' Has sido desconectado automáticamente.');
      }
    };

    // Check immediately
    checkSchedule();
    
    // Then check every minute
    const interval = setInterval(checkSchedule, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [user]);

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      setScheduleStatus(null);
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
    isAuthenticated: !!user,
    scheduleStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
