import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDemoDummyKeyForSafeGuardMobile123",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "safeguard-demo.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://safeguard-demo-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "safeguard-demo",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "safeguard-demo.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1234567890:android:abcdef123456"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

let db = null;
let auth = null;
let storage = null;

try {
  if (app) {
    storage = getStorage(app);
  }
} catch (e) {
  console.warn('[Firebase] Storage init warning:', e.message);
}

export { db, auth, storage };
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:5000";
