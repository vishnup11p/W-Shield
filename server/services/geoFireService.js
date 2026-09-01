const geofire = require('geofire-common');
const { db } = require('./firebaseAdmin');

/**
 * Computes geohash for coordinates [lat, lng]
 */
function computeGeohash(latitude, longitude) {
  return geofire.geohashForLocation([latitude, longitude]);
}

/**
 * Calculates distance in meters between two [lat, lng] coordinates
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const distInKm = geofire.distanceBetween([lat1, lon1], [lat2, lon2]);
  return distInKm * 1000;
}

/**
 * Queries Realtime Database for users within a radius in meters
 * Follows exact geohashQueryBounds + bounding range search + true distance filter
 * 
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusInM (default 1000m)
 * @param {string} excludeUid (victim UID to exclude)
 */
async function findNearbyUsers(latitude, longitude, radiusInM = 1000, excludeUid = null) {
  const center = [latitude, longitude];
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  const promises = [];

  if (!db) {
    console.warn('[GeoFireService] Realtime Database not ready, returning mock nearby users for demo');
    return [
      {
        uid: 'user_nearby_1',
        phone: '+919999900001',
        fcmToken: 'mock_fcm_token_1',
        distanceMeters: 320,
        approximateLat: latitude + 0.002,
        approximateLng: longitude + 0.001
      },
      {
        uid: 'user_nearby_2',
        phone: '+919999900002',
        fcmToken: 'mock_fcm_token_2',
        distanceMeters: 650,
        approximateLat: latitude - 0.003,
        approximateLng: longitude + 0.002
      }
    ];
  }

  const usersRef = db.ref('users');

  for (const b of bounds) {
    const q = usersRef
      .orderByChild('currentLocation/geohash')
      .startAt(b[0])
      .endAt(b[1])
      .once('value');
    promises.push(q);
  }

  const snapshots = await Promise.all(promises);
  const matchingUsers = new Map();

  for (const snap of snapshots) {
    const val = snap.val();
    if (!val) continue;

    for (const [uid, user] of Object.entries(val)) {
      if (excludeUid && uid === excludeUid) continue;
      if (!user.currentLocation || !user.currentLocation.latitude || !user.currentLocation.longitude) continue;

      const userLat = user.currentLocation.latitude;
      const userLng = user.currentLocation.longitude;
      const distanceInKm = geofire.distanceBetween([userLat, userLng], center);
      const distanceInM = distanceInKm * 1000;

      // Filter step: only keep users strictly inside radius
      if (distanceInM <= radiusInM) {
        matchingUsers.set(uid, {
          uid,
          phone: user.phone,
          fcmToken: user.fcmToken,
          distanceMeters: Math.round(distanceInM),
          // Privacy fuzzing: return rough coordinates for third-party alerts
          approximateLat: parseFloat(userLat.toFixed(3)),
          approximateLng: parseFloat(userLng.toFixed(3))
        });
      }
    }
  }

  return Array.from(matchingUsers.values());
}

module.exports = {
  computeGeohash,
  calculateDistanceMeters,
  findNearbyUsers
};
