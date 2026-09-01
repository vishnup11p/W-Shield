import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDemoDummyKeyForSafeGuardMobile123",
  authDomain: "safeguard-demo.firebaseapp.com",
  databaseURL: "https://safeguard-demo-default-rtdb.firebaseio.com",
  projectId: "safeguard-demo",
  storageBucket: "safeguard-demo.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:android:abcdef123456"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const BACKEND_URL = "http://10.0.2.2:5000"; // Android Emulator to Host localhost:5000 (or PC LAN IP)
