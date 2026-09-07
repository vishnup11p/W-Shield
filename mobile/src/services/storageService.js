import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_PROFILE: 'sg_user_profile',
  AUTH_TOKEN: 'sg_auth_token',
  AUTH_UID: 'sg_auth_uid',
  CONTACTS: 'sg_contacts',
  SETTINGS: 'sg_settings',
  SOS_QUEUE: 'sg_sos_queue',
  EMERGENCY_HISTORY: 'sg_emergency_history',
  ACTIVE_SESSION: 'sg_active_session',
};

// ─── User Profile ──────────────────────────────────────────────────────────

export async function saveUserProfile(profile) {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Auth Token ────────────────────────────────────────────────────────────

export async function saveAuthSession(uid, token) {
  await AsyncStorage.setItem(KEYS.AUTH_UID, uid);
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

export async function getAuthSession() {
  try {
    const uid = await AsyncStorage.getItem(KEYS.AUTH_UID);
    const token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return uid ? { uid, token } : null;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  await AsyncStorage.multiRemove([KEYS.AUTH_UID, KEYS.AUTH_TOKEN, KEYS.USER_PROFILE, KEYS.ACTIVE_SESSION]);
}

// ─── Emergency Contacts ────────────────────────────────────────────────────

export async function saveContacts(contacts) {
  await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
}

export async function getContacts() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CONTACTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Safety Settings ───────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  shakeEnabled: true,
  voiceEnabled: false,
  fallDetectionEnabled: false,
  countdownSeconds: 5,
  shakeSensitivity: 2.4,
  smsPhase2Enabled: false,
  evidenceRecordingEnabled: true,
  locationSharingEnabled: true,
};

export async function saveSettings(settings) {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ─── Offline SOS Queue ─────────────────────────────────────────────────────

export async function enqueueSOSAlert(alert) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SOS_QUEUE);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...alert, queuedAt: Date.now() });
    await AsyncStorage.setItem(KEYS.SOS_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.warn('[StorageService] Enqueue SOS failed:', err.message);
  }
}

export async function getSOSQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SOS_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearSOSQueue() {
  await AsyncStorage.removeItem(KEYS.SOS_QUEUE);
}

// ─── Active Session ────────────────────────────────────────────────────────

export async function saveActiveSession(session) {
  await AsyncStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
}

export async function getActiveSession() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearActiveSession() {
  await AsyncStorage.removeItem(KEYS.ACTIVE_SESSION);
}

// ─── Emergency History (local cache) ──────────────────────────────────────

export async function appendToHistory(session) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.EMERGENCY_HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    // Keep last 50 sessions only
    const updated = [session, ...history].slice(0, 50);
    await AsyncStorage.setItem(KEYS.EMERGENCY_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[StorageService] Append history failed:', err.message);
  }
}

export async function getLocalHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.EMERGENCY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
