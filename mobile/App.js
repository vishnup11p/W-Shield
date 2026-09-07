// SafeGuard — Network-Adaptive Women Safety System
// Root Router: wires all screens, state, and services together.

import { Buffer } from 'buffer';
global.Buffer = Buffer;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AppState } from 'react-native';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import EmergencyActiveScreen from './src/screens/EmergencyActiveScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import EvidenceScreen from './src/screens/EvidenceScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Services
import { getCurrentGPSPosition, startContinuousLocationTracking, stopContinuousLocationTracking } from './src/services/locationService';
import { getNetworkState, subscribeToNetworkState } from './src/services/netinfoService';
import { sendEmergencySMSPhase1, sendEmergencySMSPhase2, buildEmergencyMessage } from './src/services/smsFallbackService';
import { startEvidenceRecording, stopEvidenceRecording } from './src/services/evidenceService';
import { startShakeDetection, stopShakeDetection, startVoiceDetection, stopVoiceDetection } from './src/services/triggerService';
import { connectSocket, streamLocationPing, disconnectSocket, isSocketConnected } from './src/services/socketService';
import {
  getAuthSession, getUserProfile, getContacts, getSettings,
  saveContacts, saveSettings, saveActiveSession, clearActiveSession,
  appendToHistory, getActiveSession
} from './src/services/storageService';
import { onAuthChange } from './src/services/authService';
import { BACKEND_URL } from './src/config/firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// SOS States:  IDLE → COUNTDOWN → TRIGGERED → SENDING → CONFIRMED → RESOLVED
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ─── Auth ───────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [screenParams, setScreenParams] = useState({});

  const navigate = useCallback((screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  }, []);

  // ─── App State ──────────────────────────────────────────────────────────
  const [networkStatus, setNetworkStatus] = useState('ONLINE');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({
    shakeEnabled: true,
    voiceEnabled: false,
    fallDetectionEnabled: false,
    countdownSeconds: 5,
    smsPhase2Enabled: false,
    evidenceRecordingEnabled: true,
    locationSharingEnabled: true,
  });

  // ─── SOS State ──────────────────────────────────────────────────────────
  const [sosState, setSosState] = useState('IDLE');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('IDLE');
  const [nearbyCount, setNearbyCount] = useState(0);

  const countdownRef = useRef(null);
  const elapsedRef = useRef(null);
  const countdownValueRef = useRef(5);

  // ─── Boot Sequence ───────────────────────────────────────────────────────
  useEffect(() => {
    let authUnsub = () => {};
    const boot = async () => {
      try {
        // 1. Load cached session + profile
        const session = await getAuthSession();
        const profile = await getUserProfile();
        const savedContacts = await getContacts();
        const savedSettings = await getSettings();

        if (savedContacts.length > 0) setContacts(savedContacts);
        if (savedSettings) setSettings(savedSettings);

        // 2. Check for interrupted active session
        const activeSession = await getActiveSession();
        if (activeSession && activeSession.sessionId) {
          setActiveSessionId(activeSession.sessionId);
          setSosState('CONFIRMED');
        }

        if (session?.uid && profile) {
          setUserProfile(profile);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.warn('[Boot] Initialization error:', e.message);
      } finally {
        setAuthLoading(false);
      }

      // 3. Watch Firebase Auth state changes
      authUnsub = onAuthChange(async (firebaseUser) => {
        if (!firebaseUser) {
          // Firebase signed out — but we still allow local demo sessions
          const session = await getAuthSession();
          const profile = await getUserProfile();
          if (!session || !profile) {
            setIsAuthenticated(false);
            setUserProfile(null);
          }
        }
      });
    };

    boot();
    return () => authUnsub();
  }, []);

  // ─── Network Listener ────────────────────────────────────────────────────
  useEffect(() => {
    getNetworkState().then(setNetworkStatus);
    const unsub = subscribeToNetworkState((mode) => setNetworkStatus(mode));
    return () => unsub();
  }, []);

  // ─── Shake + Voice + Fall Detection ──────────────────────────────────────
  useEffect(() => {
    if (sosState !== 'IDLE') return;

    if (settings.shakeEnabled) {
      startShakeDetection((type) => {
        console.log('[App] Shake trigger received');
        triggerSOS('SHAKE');
      });
    }

    if (settings.voiceEnabled) {
      startVoiceDetection((type) => {
        console.log('[App] Voice trigger received');
        triggerSOS('VOICE');
      });
    }

    return () => {
      stopShakeDetection();
      stopVoiceDetection();
    };
  }, [settings.shakeEnabled, settings.voiceEnabled, sosState]);

  // ─── Elapsed Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const isActive = sosState === 'TRIGGERED' || sosState === 'SENDING' || sosState === 'CONFIRMED';
    if (isActive) {
      elapsedRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(elapsedRef.current);
      setElapsedSeconds(0);
    }
    return () => clearInterval(elapsedRef.current);
  }, [sosState]);

  // ─── SOS PIPELINE ─────────────────────────────────────────────────────────

  /**
   * Step 1: Start countdown. Allows cancellation.
   */
  const triggerSOS = useCallback((triggerType = 'BUTTON') => {
    if (sosState !== 'IDLE' && sosState !== 'RESOLVED') return;

    const cd = settings.countdownSeconds || 5;
    countdownValueRef.current = cd;
    setCountdown(cd);
    setSosState('COUNTDOWN');
    console.log(`[SOS] Countdown started (${cd}s), trigger: ${triggerType}`);

    countdownRef.current = setInterval(() => {
      countdownValueRef.current -= 1;
      setCountdown(countdownValueRef.current);
      if (countdownValueRef.current <= 0) {
        clearInterval(countdownRef.current);
        activateEmergency(triggerType);
      }
    }, 1000);
  }, [sosState, settings.countdownSeconds]);

  /**
   * Cancel countdown before SOS fires.
   */
  const cancelCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
    setSosState('IDLE');
    setCountdown(settings.countdownSeconds || 5);
    console.log('[SOS] Countdown cancelled by user');
  }, [settings.countdownSeconds]);

  /**
   * Step 2: Countdown complete — execute emergency workflow.
   */
  const activateEmergency = async (triggerType = 'BUTTON') => {
    setSosState('TRIGGERED');
    console.log(`[SOS] EMERGENCY ACTIVATED — type: ${triggerType}`);

    try {
      // A: Get GPS
      let gps = null;
      try {
        gps = await getCurrentGPSPosition();
        setCurrentCoords(gps);
      } catch (gpsErr) {
        console.warn('[SOS] GPS error:', gpsErr.message);
        Alert.alert('GPS Unavailable', 'Could not get your location. SOS will still be sent.');
      }

      setSosState('SENDING');
      const lat = gps?.latitude ?? 0;
      const lng = gps?.longitude ?? 0;

      // B: Assess network
      const netMode = await getNetworkState();
      setNetworkStatus(netMode);

      let sessionId = `sos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // C: If online — call backend
      if (netMode === 'ONLINE' || netMode === 'POOR') {
        try {
          const res = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              victimUid: userProfile?.uid || 'anonymous',
              victimName: userProfile?.name || 'SafeGuard User',
              victimPhone: userProfile?.phone || '',
              triggerType,
              networkStateAtTrigger: netMode,
              latitude: lat,
              longitude: lng,
            }),
          });
          const data = await res.json();
          if (data.sessionId) sessionId = data.sessionId;
          if (data.nearbyUsersCount) setNearbyCount(data.nearbyUsersCount);
        } catch (backendErr) {
          console.warn('[SOS] Backend unreachable, continuing with local ID:', backendErr.message);
        }
      }

      // D: SMS fallback when offline or poor
      const activeContacts = contacts.filter(c => c.enabled !== false);
      if (netMode === 'OFFLINE' || netMode === 'POOR') {
        const phones = activeContacts.map(c => c.phone).filter(Boolean);
        const msg = buildEmergencyMessage(userProfile?.name, lat, lng);
        if (phones.length > 0) {
          if (settings.smsPhase2Enabled) {
            await sendEmergencySMSPhase2(phones, msg);
          } else {
            await sendEmergencySMSPhase1(phones, msg);
          }
        }
      }

      // E: Set session, save to storage
      setActiveSessionId(sessionId);
      await saveActiveSession({
        sessionId,
        startedAt: Date.now(),
        victimUid: userProfile?.uid,
        triggerType,
        latitude: lat,
        longitude: lng,
      });

      // F: Connect Socket.IO for real-time location streaming
      if (netMode !== 'OFFLINE') {
        connectSocket(sessionId, (status) => {
          console.log('[Socket] Status:', status);
        });
      }

      // G: Start continuous GPS + stream to backend
      if (settings.locationSharingEnabled) {
        startContinuousLocationTracking(async (ping) => {
          setCurrentCoords(ping);
          // Try socket first, fall back to REST
          const sent = streamLocationPing(sessionId, userProfile?.uid, ping);
          if (!sent) {
            try {
              await fetch(`${BACKEND_URL}/api/sos/${sessionId}/location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ victimUid: userProfile?.uid, ...ping }),
              });
            } catch (e) { /* offline */ }
          }
        });
      }

      // H: Start evidence recording
      if (settings.evidenceRecordingEnabled) {
        const started = await startEvidenceRecording(sessionId);
        setRecordingStatus(started ? 'RECORDING' : 'UNAVAILABLE');
      }

      setSosState('CONFIRMED');
      navigate('EmergencyActive');

    } catch (err) {
      console.error('[SOS] Emergency activation error:', err);
      Alert.alert('SOS Error', err.message);
      setSosState('IDLE');
    }
  };

  /**
   * Resolve / cancel active SOS.
   */
  const resolveSOS = useCallback(async () => {
    try {
      stopContinuousLocationTracking();
      disconnectSocket();

      if (activeSessionId) {
        await stopEvidenceRecording(activeSessionId);
        try {
          await fetch(`${BACKEND_URL}/api/sos/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: activeSessionId, victimUid: userProfile?.uid }),
          });
        } catch (e) { /* offline */ }

        // Save to local history
        await appendToHistory({
          sessionId: activeSessionId,
          status: 'RESOLVED',
          startedAt: Date.now() - elapsedSeconds * 1000,
          endedAt: Date.now(),
          victimUid: userProfile?.uid,
        });
      }

      await clearActiveSession();
      setActiveSessionId(null);
      setNearbyCount(0);
      setRecordingStatus('IDLE');
      setSosState('RESOLVED');
      setTimeout(() => setSosState('IDLE'), 1500);
      navigate('Home');

    } catch (err) {
      console.warn('[SOS] Resolve error:', err.message);
      setSosState('IDLE');
    }
  }, [activeSessionId, userProfile, elapsedSeconds]);

  // ─── Auth Handlers ────────────────────────────────────────────────────────

  const handleAuthenticated = async (profile) => {
    setUserProfile(profile);
    setIsAuthenticated(true);
    navigate('Home');
  };

  const handleLogout = () => {
    setSosState('IDLE');
    clearInterval(countdownRef.current);
    setIsAuthenticated(false);
    setUserProfile(null);
    setCurrentScreen('Home');
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  if (authLoading) {
    // Brief splash while checking cached auth session
    const { View, ActivityIndicator } = require('react-native');
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0e17', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const screenProps = {
    userProfile,
    setUserProfile,
    contacts,
    setContacts,
    settings,
    setSettings,
    networkStatus,
    currentCoords,
    sosState,
    countdown,
    activeSessionId,
    elapsedSeconds,
    recordingStatus,
    nearbyCount,
    navigate,
    onTriggerSOS: triggerSOS,
    onCancelCountdown: cancelCountdown,
    onResolveSOS: resolveSOS,
    onLogout: handleLogout,
  };

  switch (currentScreen) {
    case 'Home':
      return <HomeScreen {...screenProps} />;
    case 'EmergencyActive':
      return <EmergencyActiveScreen {...screenProps} sessionId={activeSessionId} />;
    case 'Contacts':
      return <ContactsScreen {...screenProps} />;
    case 'Evidence':
      return <EvidenceScreen {...screenProps} activeSessionId={activeSessionId} />;
    case 'History':
      return <HistoryScreen {...screenProps} />;
    case 'Profile':
      return <ProfileScreen {...screenProps} />;
    case 'Settings':
      return <SettingsScreen {...screenProps} />;
    default:
      return <HomeScreen {...screenProps} />;
  }
}
