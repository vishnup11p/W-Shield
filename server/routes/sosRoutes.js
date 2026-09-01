const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const { computeGeohash, findNearbyUsers } = require('../services/geoFireService');
const { sendEmergencyPushNotification } = require('../services/notificationService');

/**
 * POST /api/sos/trigger
 * Trigger a new SOS session
 */
router.post('/trigger', async (req, res) => {
  try {
    const {
      victimUid,
      victimName,
      victimPhone,
      triggerType = 'BUTTON',
      networkStateAtTrigger = 'ONLINE',
      batteryLevel = 1.0,
      latitude,
      longitude,
      approximateAddress = 'Live Location Stream'
    } = req.body;

    if (!victimUid || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'victimUid, latitude, and longitude are required' });
    }

    const sessionId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const geohash = computeGeohash(latitude, longitude);

    const sessionData = {
      sessionId,
      victimUid,
      victimName: victimName || 'SafeGuard User',
      victimPhone: victimPhone || 'Unknown',
      status: 'SENDING',
      triggerType,
      networkStateAtTrigger,
      batteryLevel,
      initialLocation: {
        latitude,
        longitude,
        geohash,
        approximateAddress
      },
      startedAt: Date.now(),
      endedAt: null
    };

    if (db) {
      // 1. Write SOS session to RTDB
      await db.ref(`sosSessions/${sessionId}`).set(sessionData);
      // 2. Mark user active session
      await db.ref(`users/${victimUid}/activeSOSId`).set(sessionId);
      // 3. Write initial ping
      await db.ref(`locationPings/${sessionId}`).push({
        latitude,
        longitude,
        geohash,
        timestamp: Date.now()
      });
    }

    // 4. Discover nearby users for community alerting
    const nearbyUsers = await findNearbyUsers(latitude, longitude, 1000, victimUid);
    const nearbyTokens = nearbyUsers.map(u => u.fcmToken).filter(Boolean);

    if (nearbyTokens.length > 0) {
      await sendEmergencyPushNotification(nearbyTokens, {
        title: '⚠️ EMERGENCY NEARBY',
        body: `A person roughly 500-1000m from your location needs emergency help.`,
        sessionId,
        type: 'NEARBY_SOS',
        latitude: parseFloat(latitude.toFixed(3)),
        longitude: parseFloat(longitude.toFixed(3))
      });
    }

    return res.status(201).json({
      success: true,
      sessionId,
      sessionData,
      nearbyUsersCount: nearbyUsers.length
    });
  } catch (err) {
    console.error('[SOS Trigger Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sos/acknowledge
 * Emergency contact acknowledges SOS
 */
router.post('/acknowledge', async (req, res) => {
  try {
    const { sessionId, contactId, contactName } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const ackData = {
      contactId: contactId || 'web_dashboard',
      contactName: contactName || 'Family Member',
      acknowledgedAt: Date.now()
    };

    if (db) {
      await db.ref(`sosSessions/${sessionId}/status`).set('CONFIRMED');
      await db.ref(`sosSessions/${sessionId}/acknowledgedBy`).set(ackData);
    }

    res.json({ success: true, status: 'CONFIRMED', acknowledgedBy: ackData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sos/resolve
 * Resolves / cancels active SOS session with PIN
 */
router.post('/resolve', async (req, res) => {
  try {
    const { sessionId, victimUid, pin } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    if (db) {
      await db.ref(`sosSessions/${sessionId}/status`).set('RESOLVED');
      await db.ref(`sosSessions/${sessionId}/endedAt`).set(Date.now());
      if (victimUid) {
        await db.ref(`users/${victimUid}/activeSOSId`).set(null);
      }
    }

    res.json({ success: true, status: 'RESOLVED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sos/nearby
 * Query nearby users directly
 */
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 1000;
    const excludeUid = req.query.excludeUid || null;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters required' });
    }

    const users = await findNearbyUsers(lat, lng, radius, excludeUid);
    res.json({ success: true, users, count: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
