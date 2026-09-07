const express = require('express');
const router = express.Router();
const { db, auth } = require('../services/firebaseAdmin');
const { requireAuth } = require('../middleware/authMiddleware');

/**
 * POST /auth/register
 * Creates or updates a user profile in the Realtime Database.
 * The client must provide a valid Firebase ID token obtained after
 * Firebase Auth signInWithEmailAndPassword / createUserWithEmailAndPassword.
 */
router.post('/register', async (req, res) => {
  try {
    const { idToken, name, phone } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    let uid = 'demo_user';
    let email = '';

    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        uid = decoded.uid;
        email = decoded.email || '';
      } catch (tokenErr) {
        return res.status(403).json({ error: 'Invalid or expired Firebase ID token' });
      }
    }

    const profile = {
      uid,
      name: (name || '').trim() || 'SafeGuard User',
      phone: (phone || '').trim(),
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fcmToken: null,
      currentLocation: null,
      activeSOSId: null
    };

    if (db) {
      await db.ref(`users/${uid}`).update(profile);
    }

    console.log(`[Auth] User registered: ${uid}`);
    res.status(201).json({ success: true, uid, profile });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/login
 * Verifies Firebase ID token and returns user profile.
 * Also updates FCM token if provided.
 */
router.post('/login', async (req, res) => {
  try {
    const { idToken, fcmToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    let uid = 'demo_user';
    let email = '';

    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        uid = decoded.uid;
        email = decoded.email || '';
      } catch (tokenErr) {
        return res.status(403).json({ error: 'Invalid or expired Firebase ID token' });
      }
    }

    let profile = {
      uid,
      name: 'SafeGuard User',
      phone: '',
      email,
      fcmToken: fcmToken || null
    };

    if (db) {
      // Fetch existing profile
      const snap = await db.ref(`users/${uid}`).once('value');
      const existing = snap.val();
      if (existing) {
        profile = { ...existing, ...profile };
      }
      // Update FCM token and lastSeen
      await db.ref(`users/${uid}`).update({
        fcmToken: fcmToken || existing?.fcmToken || null,
        lastSeenAt: Date.now(),
        uid
      });
    }

    console.log(`[Auth] User login: ${uid}`);
    res.json({ success: true, uid, profile });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /auth/profile/:uid
 * Returns user profile.
 */
router.get('/profile/:uid', requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    if (!db) {
      return res.json({ profile: { uid, name: 'Demo User', phone: '', email: '' } });
    }

    const snap = await db.ref(`users/${uid}`).once('value');
    const profile = snap.val();
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Never return FCM token to the client
    const { fcmToken: _fcm, ...safeProfile } = profile;
    res.json({ profile: safeProfile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /auth/profile/:uid
 * Updates user display name and phone.
 */
router.put('/profile/:uid', requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone } = req.body;

    const updates = { updatedAt: Date.now() };
    if (name && typeof name === 'string') updates.name = name.trim();
    if (phone && typeof phone === 'string') updates.phone = phone.trim();

    if (db) {
      await db.ref(`users/${uid}`).update(updates);
    }

    res.json({ success: true, updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
