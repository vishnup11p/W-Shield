import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config/firebaseConfig';

let socket = null;
let isConnected = false;

/**
 * Connect Socket.IO to the backend for real-time location streaming.
 * Call this when an emergency becomes active.
 */
export function connectSocket(sessionId, onStatusChange) {
  if (socket && isConnected) {
    // Already connected — just join the new room
    socket.emit('join_sos_session', { sessionId });
    return;
  }

  try {
    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      isConnected = true;
      console.log('[Socket] Connected to SafeGuard backend:', socket.id);
      socket.emit('join_sos_session', { sessionId });
      if (onStatusChange) onStatusChange('CONNECTED');
    });

    socket.on('disconnect', (reason) => {
      isConnected = false;
      console.warn('[Socket] Disconnected:', reason);
      if (onStatusChange) onStatusChange('DISCONNECTED');
    });

    socket.on('connect_error', (err) => {
      isConnected = false;
      console.warn('[Socket] Connection error:', err.message);
      if (onStatusChange) onStatusChange('ERROR');
    });

    socket.on('live_location_update', (payload) => {
      console.log('[Socket] Live location broadcast received:', payload);
    });

    socket.on('sos_status_changed', (payload) => {
      console.log('[Socket] SOS status changed:', payload);
    });
  } catch (err) {
    console.warn('[Socket] Failed to initialize:', err.message);
  }
}

/**
 * Stream a GPS location ping to the backend for this emergency session.
 * Falls back silently if socket is not connected.
 */
export function streamLocationPing(sessionId, victimUid, coords) {
  if (!socket || !isConnected) {
    return false; // Caller should use REST fallback
  }

  socket.emit('stream_location_ping', {
    sessionId,
    victimUid,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy || null,
    speed: coords.speed || null,
    altitude: coords.altitude || null,
    timestamp: coords.timestamp || Date.now(),
  });

  return true;
}

/**
 * Disconnect the socket. Call when emergency ends.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
    console.log('[Socket] Disconnected from backend.');
  }
}

/**
 * Returns true if socket is currently connected.
 */
export function isSocketConnected() {
  return isConnected;
}
