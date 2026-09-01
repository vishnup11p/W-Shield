import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoDummyKeyForSafeGuardLiveDashboard123",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "safeguard-demo.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://safeguard-demo-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "safeguard-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "safeguard-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
export { ref, onValue, set, update };
