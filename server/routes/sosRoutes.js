const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const { computeGeohash, findNearbyUsers } = require('../services/geoFireService');
const { sendEmergencyPushNotification } = require('../services/notificationService');

// In-memory retry/escalation active tracker for active sessions
const activeEscalationTimers = new Map();

/**
 * Helper to trigger escalation if no contact acknowledges within 45 seconds
 */
function scheduleEscalationTimer(sessionId, victimUid, latitude, longitude) {
  if (activeEscalationTimers.has(sessionId)) {
    clearTimeout(activeEscalationTimers.get(sessionId));
  }

  const timer = setTimeout(async () => {
    try {
      if (!db) return;
      const snap = await db.ref(`sosSessions/${sessionId}`).once('value');
      const session = snap.val();

      // If session is still not confirmed/resolved, trigger ESCALATION
      if (session && (session.status === 'TRIGGERED' || session.status === 'SENDING')) {
        console.log(`[ESCALATION TRIGGERED] Session ${sessionId} unacknowledged after timeout. Escalating...`);
        
        // 1. Update status to ESCALATED
        await db.ref(`sosSessions/${sessionId}/status`).set('ESCALATED');
        await db.ref(`sosSessions/${sessionId}/escalatedAt`).set(Date.now());

        // 2. Widen nearby radius to 2.5km to find broader responders
        const wideRadius = parseInt(process.env.ESCALATED_NEARBY_RADIUS_METERS) || 2500;
        const expandedNearbyUsers = await findNearbyUsers(latitude, longitude, wideRadius, victimUid);
        const tokens = expandedNearbyUsers.map(u => u.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
          await sendEmergencyPushNotification(tokens, {
            title: '🚨 CRITICAL ESCALATED SOS ALERT',
            body: `Emergency alert for ${session.victimName || 'a citizen'} is unacknowledged. Expanding community response radius (${wideRadius}m).`,
            sessionId,
            type: 'ESCALATED_SOS',
            latitude: parseFloat(latitude.toFixed(3)),
            longitude: parseFloat(longitude.toFixed(3))
          });
        }
      }
    } catch (err) {
      console.error('[Escalation Timer Error]', err.message);
    }
  }, 45000); // 45 second escalation window

  activeEscalationTimers.set(sessionId, timer);
}

/**
 * POST /api/sos/trigger
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

    // Strict validation
    if (!victimUid || typeof victimUid !== 'string') {
      return res.status(400).json({ error: 'Valid victimUid is required' });
    }
    if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid latitude and longitude numeric values are required' });
    }

    const sessionId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const geohash = computeGeohash(Number(latitude), Number(longitude));

    const sessionData = {
      sessionId,
      victimUid,
      victimName: victimName || 'SafeGuard User',
      victimPhone: victimPhone || 'Unknown',
      status: 'SENDING',
      triggerType,
      networkStateAtTrigger,
      batteryLevel: Number(batteryLevel) || 1.0,
      initialLocation: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        geohash,
        approximateAddress
      },
      startedAt: Date.now(),
      endedAt: null
    };

    if (db) {
      await db.ref(`sosSessions/${sessionId}`).set(sessionData);
      await db.ref(`users/${victimUid}/activeSOSId`).set(sessionId);
      await db.ref(`locationPings/${sessionId}`).push({
        latitude: Number(latitude),
        longitude: Number(longitude),
        geohash,
        timestamp: Date.now()
      });
    }

    // Schedule escalation timeout (45s window)
    scheduleEscalationTimer(sessionId, victimUid, Number(latitude), Number(longitude));

    // Nearby user dispatch
    const defaultRadius = parseInt(process.env.DEFAULT_NEARBY_RADIUS_METERS) || 1000;
    const nearbyUsers = await findNearbyUsers(Number(latitude), Number(longitude), defaultRadius, victimUid);
    const nearbyTokens = nearbyUsers.map(u => u.fcmToken).filter(Boolean);

    if (nearbyTokens.length > 0) {
      await sendEmergencyPushNotification(nearbyTokens, {
        title: '⚠️ EMERGENCY SOS NEARBY',
        body: `A person roughly within 1km of your location has triggered an SOS alert.`,
        sessionId,
        type: 'NEARBY_SOS',
        latitude: parseFloat(Number(latitude).toFixed(3)),
        longitude: parseFloat(Number(longitude).toFixed(3))
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
 */
router.post('/acknowledge', async (req, res) => {
  try {
    const { sessionId, contactId, contactName } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    // Cancel escalation timer if active
    if (activeEscalationTimers.has(sessionId)) {
      clearTimeout(activeEscalationTimers.get(sessionId));
      activeEscalationTimers.delete(sessionId);
      console.log(`[Acknowledgment] Escalation timer stopped for session ${sessionId}`);
    }

    const ackData = {
      contactId: contactId || 'web_dashboard',
      contactName: contactName || 'Emergency Contact',
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
 */
router.post('/resolve', async (req, res) => {
  try {
    const { sessionId, victimUid } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    if (activeEscalationTimers.has(sessionId)) {
      clearTimeout(activeEscalationTimers.get(sessionId));
      activeEscalationTimers.delete(sessionId);
    }

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
 */
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 1000;
    const excludeUid = req.query.excludeUid || null;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid numeric lat and lng query parameters are required' });
    }

    const users = await findNearbyUsers(lat, lng, radius, excludeUid);
    res.json({ success: true, users, count: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sos/history/:uid
 * Returns the emergency session history for a user, sorted newest first.
 */
router.get('/history/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'uid is required' });

    if (!db) {
      return res.json({ history: [], count: 0 });
    }

    const snap = await db.ref('sosSessions').once('value');
    const allSessions = snap.val() || {};

    const userSessions = Object.entries(allSessions)
      .map(([id, session]) => ({ id, ...session }))
      .filter(s => s.victimUid === uid)
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

    res.json({ history: userSessions, count: userSessions.length });
  } catch (err) {
    console.error('[SOS History Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sos/:sessionId/location
 * REST fallback for streaming location pings when Socket.IO is unavailable.
 */
router.post('/:sessionId/location', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { victimUid, latitude, longitude, accuracy, speed, altitude } = req.body;

    if (!sessionId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'sessionId, latitude, longitude are required' });
    }

    const { computeGeohash } = require('../services/geoFireService');
    const geohash = computeGeohash(Number(latitude), Number(longitude));

    const pingPayload = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy || null,
      speed: speed || null,
      altitude: altitude || null,
      geohash,
      timestamp: Date.now()
    };

    if (db) {
      await db.ref(`locationPings/${sessionId}`).push(pingPayload);
      if (victimUid) {
        await db.ref(`users/${victimUid}/currentLocation`).set({
          latitude: Number(latitude),
          longitude: Number(longitude),
          geohash,
          updatedAt: Date.now()
        });
      }
    }

    res.json({ success: true, pingPayload });
  } catch (err) {
    console.error('[Location Ping Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

