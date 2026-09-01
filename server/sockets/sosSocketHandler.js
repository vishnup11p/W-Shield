const { db } = require('../services/firebaseAdmin');
const { computeGeohash } = require('../services/geoFireService');

function setupSosSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join room for a specific SOS session
    socket.on('join_sos_session', ({ sessionId }) => {
      if (sessionId) {
        socket.join(`sos_${sessionId}`);
        console.log(`[Socket] Client ${socket.id} joined room sos_${sessionId}`);
      }
    });

    // Stream location ping
    socket.on('stream_location_ping', async (data) => {
      const { sessionId, victimUid, latitude, longitude, accuracy, speed, altitude, timestamp } = data;
      if (!sessionId || latitude === undefined || longitude === undefined) return;

      const geohash = computeGeohash(latitude, longitude);
      const pingPayload = {
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        altitude: altitude || null,
        geohash,
        timestamp: timestamp || Date.now()
      };

      // Broadcast to all clients watching this SOS session
      io.to(`sos_${sessionId}`).emit('live_location_update', pingPayload);

      // Persist to Firebase Realtime Database
      if (db) {
        try {
          await db.ref(`locationPings/${sessionId}`).push(pingPayload);
          if (victimUid) {
            await db.ref(`users/${victimUid}/currentLocation`).set({
              latitude,
              longitude,
              geohash,
              updatedAt: Date.now()
            });
          }
        } catch (e) {
          console.error('[Socket] Failed to persist location ping:', e.message);
        }
      }
    });

    // Acknowledge SOS via socket
    socket.on('acknowledge_sos', async ({ sessionId, contactName }) => {
      if (!sessionId) return;
      const ackPayload = {
        sessionId,
        contactName: contactName || 'Family Member',
        acknowledgedAt: Date.now()
      };
      io.to(`sos_${sessionId}`).emit('sos_status_changed', { status: 'CONFIRMED', acknowledgedBy: ackPayload });

      if (db) {
        await db.ref(`sosSessions/${sessionId}/status`).set('CONFIRMED');
        await db.ref(`sosSessions/${sessionId}/acknowledgedBy`).set(ackPayload);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = setupSosSockets;
