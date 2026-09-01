const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;
let storage = null;
let messaging = null;

try {
  const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://safeguard-demo-default-rtdb.firebaseio.com",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "safeguard-demo.appspot.com"
    });
    console.log('[FirebaseAdmin] Initialized with serviceAccountKey.json');
  } else {
    // Demo / fallback initialization
    admin.initializeApp({
      projectId: 'safeguard-demo',
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://safeguard-demo-default-rtdb.firebaseio.com",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "safeguard-demo.appspot.com"
    });
    console.log('[FirebaseAdmin] Initialized with default demo configuration');
  }

  db = admin.database();
  auth = admin.auth();
  storage = admin.storage();
  messaging = admin.messaging();
} catch (err) {
  console.warn('[FirebaseAdmin] Firebase initialization warning:', err.message);
}

module.exports = {
  admin,
  db,
  auth,
  storage,
  messaging
};
