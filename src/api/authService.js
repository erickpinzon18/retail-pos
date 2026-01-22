import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { logSessionStart } from './firestoreService';

/**
 * Validate if user can access based on their schedule
 */
export const validateSchedule = (userProfile) => {
  // Admins have no restrictions
  if (userProfile.role === 'admin') {
    return { allowed: true, message: 'Admin access granted' };
  }
  
  // Sellers without type can access anytime (backwards compatibility)
  if (!userProfile.type) {
    return { allowed: true, message: 'Access granted' };
  }
  
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hour * 60 + minutes; // Convert to minutes since midnight
  
  const startTime = 8 * 60; // 8:00 AM in minutes
  const endTime = 21 * 60; // 9:00 PM in minutes
  
  // Check time range (8am - 9pm)
  const isWithinTimeRange = currentTime >= startTime && currentTime < endTime;
  
  if (userProfile.type === 'week') {
    // Week sellers: Monday (1) to Friday (5)
    const isWeekday = day >= 1 && day <= 5;
    
    if (!isWeekday) {
      return { 
        allowed: false, 
        message: 'Los usuarios de semana solo pueden acceder de Lunes a Viernes.'
      };
    }
    
    if (!isWithinTimeRange) {
      return { 
        allowed: false, 
        message: 'El horario de acceso es de 8:00 AM a 9:00 PM.'
      };
    }
    
    return { allowed: true, message: 'Access granted' };
  }
  
  if (userProfile.type === 'weekend') {
    // Weekend sellers: Saturday (6) or Sunday (0)
    const isWeekend = day === 0 || day === 6;
    
    if (!isWeekend) {
      return { 
        allowed: false, 
        message: 'Los usuarios de fin de semana solo pueden acceder Sábado y Domingo.'
      };
    }
    
    if (!isWithinTimeRange) {
      return { 
        allowed: false, 
        message: 'El horario de acceso es de 8:00 AM a 9:00 PM.'
      };
    }
    
    return { allowed: true, message: 'Access granted' };
  }
  
  // Unknown user type - deny access
  return { allowed: false, message: 'Tipo de usuario no válido.' };
};

// Login with email and password
export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  let userProfile = userCredential.user;
  if (userDoc.exists()) {
    userProfile = { uid: userCredential.user.uid, ...userDoc.data() };
  }
  
  // Check if user is disabled
  if (userProfile.status === false) {
    // Log FAILED session due to disabled account
    try {
      await logSessionStart(userProfile, 'failed', 'Cuenta deshabilitada por el administrador.');
    } catch (logError) {
      console.error('Could not log disabled account attempt:', logError);
    }
    await signOut(auth);
    throw new Error('Tu cuenta ha sido deshabilitada. Contacta al administrador.');
  }

  // Validate schedule
  const scheduleValidation = validateSchedule(userProfile);
  
  if (!scheduleValidation.allowed) {
    // Log FAILED session attempt (non-blocking, best effort)
    try {
      await logSessionStart(userProfile, 'failed', scheduleValidation.message);
    } catch (logError) {
      console.error('Could not log failed attempt:', logError);
    }

    // Logout the user immediately
    await signOut(auth);
    // Throw error with the schedule message
    throw new Error(scheduleValidation.message);
  }
  
  // Log session start (BLOCKING - geolocation required)
  try {
    await logSessionStart(userProfile);
  } catch (sessionError) {
    // If session logging fails (usually geolocation denied), logout and throw
    await signOut(auth);
    throw sessionError;
  }
  
  return userProfile;
};

// Logout current user
export const logout = async () => {
  await signOut(auth);
};

// Create new user (admin only)
export const createUser = async (email, password, userData) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    ...userData,
    email,
    createdAt: new Date()
  });
  
  return userCredential.user;
};

// Get current user with profile data
export const getCurrentUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.status === false) {
      throw new Error('Cuenta deshabilitada');
    }
    return { uid, ...data };
  }
  return null;
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
