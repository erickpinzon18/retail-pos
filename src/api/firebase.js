// Firebase Configuration
// Replace with your Firebase project credentials
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA2yzT1-mlJaClewvlUN_NA1AqVdYrFQAI",
  authDomain: "heart-life-352403.firebaseapp.com",
  projectId: "heart-life-352403",
  storageBucket: "heart-life-352403.firebasestorage.app",
  messagingSenderId: "734271826508",
  appId: "1:734271826508:web:50e73bceb975218519a2e9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
