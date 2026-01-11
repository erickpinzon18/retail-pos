import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Login with email and password
export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (userDoc.exists()) {
    return { ...userCredential.user, ...userDoc.data() };
  }
  return userCredential.user;
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
    return { uid, ...userDoc.data() };
  }
  return null;
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
