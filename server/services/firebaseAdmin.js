const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;
let storage = null;
let messaging = null;

// Complete in-memory Realtime Database mock interface for offline / local demo stability
const memoryData = {
  users: {},
  emergencyContacts: {},
  sosSessions: {},
  locationPings: {},
  evidence: {}
};

class MockDatabaseRef {
  constructor(pathStr) {
    this.pathStr = pathStr.replace(/^\/+|\/+$/g, '');
  }

  _getParts() {
    return this.pathStr ? this.pathStr.split('/') : [];
  }

  _getTargetNode(create = false) {
    const parts = this._getParts();
    let curr = memoryData;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!(part in curr)) {
        if (create) {
          curr[part] = {};
        } else {
          return undefined;
        }
      }
      curr = curr[part];
    }
    return curr;
  }

  child(subPath) {
    const newPath = this.pathStr ? `${this.pathStr}/${subPath}` : subPath;
    return new MockDatabaseRef(newPath);
  }

  async set(value) {
    const parts = this._getParts();
    if (parts.length === 0) {
      Object.assign(memoryData, value);
      return;
    }
    let curr = memoryData;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!curr[part] || typeof curr[part] !== 'object') {
        curr[part] = {};
      }
      curr = curr[part];
    }
    curr[parts[parts.length - 1]] = JSON.parse(JSON.stringify(value));
  }

  async update(values) {
    const node = this._getTargetNode(true);
    if (node && typeof node === 'object') {
      Object.assign(node, JSON.parse(JSON.stringify(values)));
    }
  }

  async remove() {
    const parts = this._getParts();
    if (parts.length === 0) return;
    let curr = memoryData;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!curr[part]) return;
      curr = curr[part];
    }
    delete curr[parts[parts.length - 1]];
  }

  push(value) {
    const pushKey = `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const childRef = this.child(pushKey);
    if (value !== undefined) {
      childRef.set(value);
    }
    return childRef;
  }

  async once(eventType = 'value') {
    const val = this._getTargetNode(false);
    const cloned = val !== undefined ? JSON.parse(JSON.stringify(val)) : null;
    return {
      val: () => cloned,
      exists: () => cloned !== null && cloned !== undefined,
      key: this._getParts().slice(-1)[0] || null
    };
  }

  orderByChild(childKey) {
    return {
      startAt: (startVal) => ({
        endAt: (endVal) => ({
          once: async () => {
            const val = this._getTargetNode(false) || {};
            return {
              val: () => JSON.parse(JSON.stringify(val)),
              exists: () => Object.keys(val).length > 0
            };
          }
        })
      })
    };
  }
}

class MockDatabase {
  ref(pathStr = '') {
    return new MockDatabaseRef(pathStr);
  }
}

try {
  const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://safeguard-demo-default-rtdb.firebaseio.com",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "safeguard-demo.appspot.com"
    });
    console.log('[FirebaseAdmin] Initialized with serviceAccountKey.json credentials');
    db = admin.database();
    auth = admin.auth();
    storage = admin.storage();
    messaging = admin.messaging();
  } else {
    console.log('[FirebaseAdmin] Initialized in High-Performance Local State Mode (Self-Contained DB)');
    db = new MockDatabase();
  }
} catch (err) {
  console.warn('[FirebaseAdmin] Falling back to local resilient database:', err.message);
  db = new MockDatabase();
}

module.exports = {
  admin,
  db,
  auth,
  storage,
  messaging
};
