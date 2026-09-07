import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { saveAuthSession, clearAuthSession, saveUserProfile, getUserProfile } from './storageService';
import { BACKEND_URL } from '../config/firebaseConfig';

// Firebase config — same app instance used in firebaseConfig.js
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoDummyKeyForSafeGuardMobile123',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'safeguard-demo.firebaseapp.com',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://safeguard-demo-default-rtdb.firebaseio.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'safeguard-demo',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'safeguard-demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1234567890:android:abcdef123456',
};

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

let firebaseAuth = null;
try {
  firebaseAuth = getAuth(firebaseApp);
} catch (e) {
  console.warn('[AuthService] Firebase Auth init warning:', e.message);
}

export const auth = firebaseAuth;

/**
 * Register a new user with email + password.
 * Creates a Firebase Auth account, then syncs profile to backend.
 */
export async function registerUser(email, password, name, phone) {
  if (!firebaseAuth) {
    // Demo mode fallback
    const fakeUid = `demo_${Date.now()}`;
    const profile = { uid: fakeUid, name, phone, email };
    await saveAuthSession(fakeUid, 'demo_token');
    await saveUserProfile(profile);
    return { uid: fakeUid, profile };
  }

  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  const user = credential.user;

  // Update Firebase display name
  await updateProfile(user, { displayName: name });

  const idToken = await user.getIdToken();

  // Sync to backend
  let profile = { uid: user.uid, name, phone, email };
  try {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name, phone }),
    });
    const data = await res.json();
    if (data.profile) profile = data.profile;
  } catch (backendErr) {
    console.warn('[AuthService] Backend register sync failed (demo mode):', backendErr.message);
  }

  await saveAuthSession(user.uid, idToken);
  await saveUserProfile(profile);
  return { uid: user.uid, profile };
}

/**
 * Login an existing user with email + password.
 */
export async function loginUser(email, password) {
  if (!firebaseAuth) {
    // Demo mode
    const fakeUid = `demo_${Date.now()}`;
    const profile = { uid: fakeUid, name: 'Demo User', phone: '', email };
    await saveAuthSession(fakeUid, 'demo_token');
    await saveUserProfile(profile);
    return { uid: fakeUid, profile };
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const user = credential.user;
  const idToken = await user.getIdToken();

  let profile = { uid: user.uid, name: user.displayName || 'SafeGuard User', phone: '', email };
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (data.profile) profile = data.profile;
  } catch (backendErr) {
    console.warn('[AuthService] Backend login sync failed (demo mode):', backendErr.message);
    // Use cached profile if available
    const cached = await getUserProfile();
    if (cached && cached.uid === user.uid) profile = cached;
  }

  await saveAuthSession(user.uid, idToken);
  await saveUserProfile(profile);
  return { uid: user.uid, profile };
}

/**
 * Sign out the current user.
 */
export async function logoutUser() {
  try {
    if (firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
    }
  } catch (e) {
    console.warn('[AuthService] Sign out warning:', e.message);
  }
  await clearAuthSession();
}

/**
 * Get a fresh ID token for the current user (for API calls).
 */
export async function getCurrentIdToken() {
  try {
    if (firebaseAuth && firebaseAuth.currentUser) {
      return await firebaseAuth.currentUser.getIdToken(false);
    }
  } catch (e) {
    console.warn('[AuthService] Get token warning:', e.message);
  }
  return 'demo_token';
}

/**
 * Returns the current Firebase Auth user, or null.
 */
export function getCurrentUser() {
  return firebaseAuth ? firebaseAuth.currentUser : null;
}

/**
 * Observes auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthChange(callback) {
  if (!firebaseAuth) {
    // In demo mode, always call back with null (unauthenticated)
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, callback);
}
