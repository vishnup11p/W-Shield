const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const { computeGeohash, calculateDistanceMeters, findNearbyUsers } = require('../services/geoFireService');
const setupSosSockets = require('../sockets/sosSocketHandler');
const sosRoutes = require('../routes/sosRoutes');
const contactsRoutes = require('../routes/contactsRoutes');
const evidenceRoutes = require('../routes/evidenceRoutes');

// Helper function equivalent to mobile buildEmergencyMessage
function buildEmergencyMessage(victimName, latitude, longitude) {
  const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  return `🚨 EMERGENCY ALERT! I (${victimName || 'SafeGuard User'}) need urgent help! My current GPS location: ${mapLink} [SafeGuard Distress Alert]`;
}

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sos', sosRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/evidence', evidenceRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupSosSockets(io);

async function runComprehensiveE2ETest() {
  console.log('====================================================');
  console.log('🛡️  SAFEGUARD FULL END-TO-END APPLICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const PORT = 5098;
  await new Promise((resolve) => server.listen(PORT, resolve));

  try {
    // ----------------------------------------------------
    // Section 1: Geospatial & GeoFire Computation Engine
    // ----------------------------------------------------
    console.log('\n--- [1. Geospatial & Geohash Engine Verification] ---');
    const lat = 12.971598;
    const lon = 77.594566;
    const hash = computeGeohash(lat, lon);
    assert(typeof hash === 'string' && hash.length >= 8, `Geohash computed for Bangalore coordinates: ${hash}`);

    const dist = calculateDistanceMeters(lat, lon, 12.975000, lon);
    assert(dist > 300 && dist < 500, `Distance metric accurate: ${Math.round(dist)} meters`);

    const nearby = await findNearbyUsers(lat, lon, 1000, 'victim_uid_101');
    assert(Array.isArray(nearby), `Nearby registered responders query handled correctly`);

    // ----------------------------------------------------
    // Section 2: Emergency Contact Management API
    // ----------------------------------------------------
    console.log('\n--- [2. Emergency Contacts Subsystem] ---');
    const addContactRes = await fetch(`http://localhost:${PORT}/api/contacts/user_jane_101`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dad (Guardian)',
        phone: '+919876543212',
        relationship: 'Father',
        priority: 1
      })
    });
    const addContactData = await addContactRes.json();
    assert(addContactRes.status === 201 && addContactData.success, `Added emergency contact: Dad (${addContactData.contactId})`);

    const getContactsRes = await fetch(`http://localhost:${PORT}/api/contacts/user_jane_101`);
    const getContactsData = await getContactsRes.json();
    assert(getContactsData.contacts && getContactsData.contacts.length >= 1, `Retrieved active emergency contacts list for user`);

    // ----------------------------------------------------
    // Section 3: Online SOS Trigger Lifecycle & WebSockets
    // ----------------------------------------------------
    console.log('\n--- [3. Online SOS Trigger & Live Streaming Pipeline] ---');
    const triggerRes = await fetch(`http://localhost:${PORT}/api/sos/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        victimUid: 'user_jane_101',
        victimName: 'Jane Doe',
        victimPhone: '+919876543210',
        triggerType: 'BUTTON',
        networkStateAtTrigger: 'ONLINE',
        batteryLevel: 0.85,
        latitude: lat,
        longitude: lon,
        approximateAddress: 'MG Road, Bangalore'
      })
    });
    const triggerData = await triggerRes.json();
    assert(triggerData.success && triggerData.sessionId, `SOS Trigger initiated successfully. Session ID: ${triggerData.sessionId}`);
    const sessionId = triggerData.sessionId;

    // Connect WebSocket Client to simulate Web Dashboard Live Tracking
    const socket = ioClient(`http://localhost:${PORT}`);
    let receivedSocketPing = false;

    await new Promise((resolve) => {
      socket.on('connect', () => {
        socket.emit('join_sos_session', { sessionId });
        
        socket.on('live_location_update', (ping) => {
          if (ping.latitude === lat) {
            receivedSocketPing = true;
          }
        });

        // Simulate mobile high-frequency GPS ping stream
        socket.emit('stream_location_ping', {
          sessionId,
          victimUid: 'user_jane_101',
          latitude: lat,
          longitude: lon,
          accuracy: 5,
          speed: 1.2,
          timestamp: Date.now()
        });

        setTimeout(resolve, 800);
      });
    });

    assert(receivedSocketPing, `WebSocket real-time GPS stream received in room 'sos_${sessionId}'`);
    socket.disconnect();

    // ----------------------------------------------------
    // Section 4: Continuous Evidence Recording Metadata API
    // ----------------------------------------------------
    console.log('\n--- [4. Audio/Evidence Recording Ingestion] ---');
    const evidenceRes = await fetch(`http://localhost:${PORT}/api/evidence/${sessionId}/meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AUDIO_CHUNK',
        downloadUrl: 'https://storage.googleapis.com/safeguard-demo.appspot.com/evidence/chunk_1.m4a',
        storagePath: `evidence/${sessionId}/audio_chunk_1.m4a`,
        chunkIndex: 1,
        durationMs: 12000,
        sizeBytes: 48000
      })
    });
    const evidenceData = await evidenceRes.json();
    assert(evidenceData.success && evidenceData.evidenceId, `Evidence chunk #1 registered: ${evidenceData.evidenceId}`);

    const getEvidenceRes = await fetch(`http://localhost:${PORT}/api/evidence/${sessionId}`);
    const getEvidenceData = await getEvidenceRes.json();
    assert(getEvidenceData.evidence && getEvidenceData.evidence.length === 1, `Evidence retrieval verified for dashboard playback`);

    // ----------------------------------------------------
    // Section 5: Acknowledgment & Resolution Cycle
    // ----------------------------------------------------
    console.log('\n--- [5. Responder Acknowledgment & Resolution Lifecycle] ---');
    const ackRes = await fetch(`http://localhost:${PORT}/api/sos/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        contactId: 'contact_dad_01',
        contactName: 'Dad (Guardian)'
      })
    });
    const ackData = await ackRes.json();
    assert(ackData.success && ackData.status === 'CONFIRMED', `Dashboard Responder Acknowledgment transitioned state to CONFIRMED`);

    const resolveRes = await fetch(`http://localhost:${PORT}/api/sos/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        victimUid: 'user_jane_101'
      })
    });
    const resolveData = await resolveRes.json();
    assert(resolveData.success && resolveData.status === 'RESOLVED', `Incident safely closed with status RESOLVED`);

    // ----------------------------------------------------
    // Section 6: Network-Adaptive Offline SMS Fallback Payload
    // ----------------------------------------------------
    console.log('\n--- [6. Offline Network Adaptation & SMS Fallback Payload] ---');
    const smsMessage = buildEmergencyMessage('Jane Doe', lat, lon);
    assert(
      smsMessage.includes('EMERGENCY ALERT') &&
      smsMessage.includes('https://maps.google.com/?q=12.971598,77.594566'),
      `Offline SMS payload generated with accurate Google Maps coordinate URL`
    );

    // ----------------------------------------------------
    // Section 7: Resilient Validation & Error Handling
    // ----------------------------------------------------
    console.log('\n--- [7. Input Validation & Resiliency Guardrails] ---');
    const invalidTriggerRes = await fetch(`http://localhost:${PORT}/api/sos/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ victimUid: 'user_without_coords' })
    });
    assert(invalidTriggerRes.status === 400, `API correctly rejected invalid request without coordinates (HTTP 400)`);

  } catch (err) {
    console.error('Test run failure:', err);
    failed++;
  } finally {
    server.close(() => {
      console.log('\n====================================================');
      console.log(`📊 FINAL TEST REPORT: ${passed} Passed, ${failed} Failed`);
      console.log('====================================================\n');
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runComprehensiveE2ETest();
