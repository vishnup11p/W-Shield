const express = require('express');
const http = require('http');
const cors = require('cors');
const { computeGeohash, calculateDistanceMeters, findNearbyUsers } = require('../services/geoFireService');

const app = express();
app.use(cors());
app.use(express.json());

const sosRoutes = require('../routes/sosRoutes');
const contactsRoutes = require('../routes/contactsRoutes');
const evidenceRoutes = require('../routes/evidenceRoutes');

app.use('/api/sos', sosRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/evidence', evidenceRoutes);

async function runTests() {
  console.log('🧪 ==========================================');
  console.log('🧪 Starting SafeGuard Backend & GeoFire Tests');
  console.log('🧪 ==========================================\n');

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

  // Test 1: Geohash Computation
  const lat = 12.971598;
  const lon = 77.594566;
  const hash = computeGeohash(lat, lon);
  assert(typeof hash === 'string' && hash.length >= 8, `Compute geohash for (${lat}, ${lon}) => ${hash}`);

  // Test 2: Distance Calculation (1km check)
  const dist = calculateDistanceMeters(12.971598, 77.594566, 12.975000, 77.594566);
  assert(dist > 300 && dist < 500, `Calculated distance between adjacent points: ${Math.round(dist)}m`);

  // Test 3: Nearby User Discovery (with mock fallback / DB check)
  const nearby = await findNearbyUsers(lat, lon, 1000, 'test_victim_uid');
  assert(Array.isArray(nearby), `findNearbyUsers returns an array (length: ${nearby.length})`);

  // Test 4: SOS Trigger Route Simulation
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));

  try {
    const triggerRes = await fetch('http://localhost:5099/api/sos/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        victimUid: 'user_e2e_tester_1',
        victimName: 'E2E Demo Tester',
        victimPhone: '+919999988888',
        triggerType: 'BUTTON',
        latitude: 12.9716,
        longitude: 77.5946
      })
    });
    const triggerData = await triggerRes.json();
    assert(triggerData.success === true && triggerData.sessionId, `SOS Trigger API creates session: ${triggerData.sessionId}`);

    // Test 5: Acknowledge SOS Route Simulation
    const ackRes = await fetch('http://localhost:5099/api/sos/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: triggerData.sessionId,
        contactId: 'contact_tester_1',
        contactName: 'Responder Alex'
      })
    });
    const ackData = await ackRes.json();
    assert(ackData.success === true && ackData.status === 'CONFIRMED', `SOS Acknowledge API marks status CONFIRMED`);

    // Test 6: Input Validation Edge Case (Missing required lat/lng)
    const invalidRes = await fetch('http://localhost:5099/api/sos/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        victimUid: 'user_tester_no_coords'
      })
    });
    assert(invalidRes.status === 400, `Validation correctly rejects request with missing coordinates (HTTP 400)`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n==========================================`);
  console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
