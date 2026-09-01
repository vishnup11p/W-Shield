import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDemoDummyKeyForSafeGuardLiveDashboard123",
  authDomain: "safeguard-demo.firebaseapp.com",
  databaseURL: "https://safeguard-demo-default-rtdb.firebaseio.com",
  projectId: "safeguard-demo",
  storageBucket: "safeguard-demo.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, onValue, set, update };
