import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Shield, Radio, Phone, User, CheckCircle, AlertTriangle, Wifi, Navigation, Mic, Activity } from 'lucide-react-native';

import { getCurrentGPSPosition, startContinuousLocationTracking, stopContinuousLocationTracking } from './src/services/locationService';
import { getNetworkState, subscribeToNetworkState } from './src/services/netinfoService';
import { sendEmergencySMSPhase1, sendEmergencySMSPhase2, buildEmergencyMessage } from './src/services/smsFallbackService';
import { startEvidenceRecording, stopEvidenceRecording } from './src/services/evidenceService';
import { startShakeDetection, stopShakeDetection, startVoiceDetection, stopVoiceDetection } from './src/services/triggerService';
import { BACKEND_URL } from './src/config/firebaseConfig';

export default function App() {
  // Auth & Onboarding State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phoneInput, setPhoneInput] = useState('+919876543210');
  const [otpInput, setOtpInput] = useState('123456');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // App & SOS State
  const [networkStatus, setNetworkStatus] = useState('ONLINE');
  const [sosState, setSosState] = useState('IDLE'); // IDLE | TRIGGERED | SENDING | CONFIRMED | ESCALATED | RESOLVED
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [userProfile, setUserProfile] = useState({
    uid: 'user_jane_doe_101',
    name: 'Jane Doe',
    phone: '+919876543210'
  });
  const [contacts, setContacts] = useState([
    { id: 'c1', name: 'Mom', phone: '+919876543210', relationship: 'Mother' },
    { id: 'c2', name: 'Alex (Brother)', phone: '+919876543211', relationship: 'Brother' }
  ]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // Feature Toggles
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [usePhase2SMS, setUsePhase2SMS] = useState(false);
  const [simulatingOffline, setSimulatingOffline] = useState(false);

  // 1. Setup Network and Multi-Modal Listeners on Mount
  useEffect(() => {
    getNetworkState().then((state) => {
      if (!simulatingOffline) setNetworkStatus(state);
    });

    const unsubscribeNet = subscribeToNetworkState((mode) => {
      if (!simulatingOffline) setNetworkStatus(mode);
    });

    if (shakeEnabled && sosState === 'IDLE') {
      startShakeDetection((type) => triggerSOS(type));
    }

    if (voiceEnabled && sosState === 'IDLE') {
      startVoiceDetection((type) => triggerSOS(type));
    }

    return () => {
      unsubscribeNet();
      stopShakeDetection();
      stopVoiceDetection();
    };
  }, [shakeEnabled, voiceEnabled, sosState, simulatingOffline]);

  // Handle Phone / OTP Login
  const handleVerifyOtp = () => {
    if (!phoneInput || !otpInput) {
      Alert.alert('Required', 'Please enter your phone number and 6-digit OTP code.');
      return;
    }
    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setIsAuthenticated(true);
      setUserProfile(prev => ({ ...prev, phone: phoneInput }));
    }, 600);
  };

  // 2. Full Multi-Modal SOS Trigger Pipeline
  const triggerSOS = async (triggerType = 'BUTTON') => {
    if (sosState !== 'IDLE' && sosState !== 'RESOLVED') return;

    setSosState('TRIGGERED');
    console.log(`[SOS TRIGGERED] Type: ${triggerType}`);

    try {
      // Step A: Acquire Real GPS Coordinates
      const gps = await getCurrentGPSPosition();
      setCurrentCoords(gps);

      // Step B: Assess Network Adaptation State
      const netMode = simulatingOffline ? 'OFFLINE' : await getNetworkState();
      setNetworkStatus(netMode);
      setSosState('SENDING');

      let sessionId = `sos_${Date.now()}`;
      setActiveSessionId(sessionId);

      // Step C: If Online, dispatch to Realtime Gateway & Backend
      if (netMode === 'ONLINE') {
        try {
          const res = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              victimUid: userProfile.uid,
              victimName: userProfile.name,
              victimPhone: userProfile.phone,
              triggerType,
              networkStateAtTrigger: 'ONLINE',
              latitude: gps.latitude,
              longitude: gps.longitude
            })
          });
          const data = await res.json();
          if (data.sessionId) sessionId = data.sessionId;
        } catch (backendErr) {
          console.warn('[SOS] Backend connection notice:', backendErr.message);
        }
      }

      // Step D: Trigger SMS Fallback (Phase 1 Share-Sheet vs Phase 2 Silent) if offline
      if (netMode === 'OFFLINE' || netMode === 'POOR') {
        const recipientPhones = contacts.map(c => c.phone);
        const alertMsg = buildEmergencyMessage(userProfile.name, gps.latitude, gps.longitude);
        
        if (usePhase2SMS) {
          await sendEmergencySMSPhase2(recipientPhones, alertMsg);
        } else {
          await sendEmergencySMSPhase1(recipientPhones, alertMsg);
        }
      }

      // Step E: Escalation of Sensors (High-Frequency GPS + Audio Evidence Chunking)
      startContinuousLocationTracking((ping) => {
        setCurrentCoords(ping);
      });
      startEvidenceRecording(sessionId);

      setSosState('CONFIRMED');
    } catch (err) {
      Alert.alert('GPS or Hardware Error', err.message);
      setSosState('IDLE');
    }
  };

  // 3. Resolve / Cancel Active SOS
  const resolveSOS = async () => {
    stopContinuousLocationTracking();
    if (activeSessionId) {
      await stopEvidenceRecording(activeSessionId);
      try {
        await fetch(`${BACKEND_URL}/api/sos/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            victimUid: userProfile.uid
          })
        });
      } catch (e) {}
    }
    setSosState('RESOLVED');
    setTimeout(() => setSosState('IDLE'), 2000);
    Alert.alert('SOS Deactivated', 'Emergency session safely resolved.');
  };

  const addContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Required', 'Please enter both contact name and valid phone number.');
      return;
    }
    setContacts([...contacts, { id: `c_${Date.now()}`, name: newContactName.trim(), phone: newContactPhone.trim() }]);
    setNewContactName('');
    setNewContactPhone('');
  };

  const isSOSActive = sosState === 'TRIGGERED' || sosState === 'SENDING' || sosState === 'CONFIRMED';

  // Render Login / Onboarding Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />
        <View style={styles.authWrapper}>
          <View style={styles.authLogoBox}>
            <Shield size={44} color="#ef4444" />
          </View>
          <Text style={styles.authTitle}>SafeGuard</Text>
          <Text style={styles.authSubtitle}>Network-Adaptive Women Safety System</Text>

          <View style={styles.authCard}>
            <Text style={styles.inputLabel}>Registered Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              placeholder="+91..."
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.inputLabel}>Enter 6-Digit OTP</Text>
            <TextInput
              style={styles.input}
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="numeric"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleVerifyOtp}
              style={styles.loginBtn}
            >
              {isVerifyingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Verify & Open SafeGuard</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <Shield size={28} color="#ef4444" />
          <Text style={styles.brandTitle}>SafeGuard</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              const next = !simulatingOffline;
              setSimulatingOffline(next);
              setNetworkStatus(next ? 'OFFLINE' : 'ONLINE');
            }}
            style={[styles.simBadge, simulatingOffline ? styles.simActive : null]}
          >
            <Text style={styles.simText}>{simulatingOffline ? 'DEMO: OFFLINE' : 'DEMO: ONLINE'}</Text>
          </TouchableOpacity>

          <View style={[styles.networkBadge, networkStatus === 'ONLINE' ? styles.netOnline : styles.netOffline]}>
            <Wifi size={12} color="#fff" />
            <Text style={styles.networkText}>{networkStatus}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main SOS Trigger Action */}
        <View style={styles.sosCard}>
          <Text style={styles.sosPrompt}>
            {isSOSActive ? 'EMERGENCY TRANSMISSION ACTIVE' : 'PRESS, SHAKE, OR CALL OUT TO SEND SOS'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => (isSOSActive ? resolveSOS() : triggerSOS('BUTTON'))}
            style={[styles.sosButton, isSOSActive ? styles.sosButtonActive : styles.sosButtonIdle]}
          >
            <Radio size={54} color="#fff" />
            <Text style={styles.sosButtonText}>
              {isSOSActive ? 'CANCEL SOS' : 'SOS'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.sosSubtext}>
            {isSOSActive
              ? `State: ${sosState} • Streaming GPS & Audio Chunks`
              : 'Network-Adaptive • Shake & Voice Armed'}
          </Text>
        </View>

        {/* Live GPS Coordinates Banner */}
        {currentCoords && (
          <View style={styles.coordsCard}>
            <View style={styles.coordRow}>
              <Navigation size={16} color="#06b6d4" />
              <Text style={styles.coordTitle}>Active GPS Telemetry:</Text>
            </View>
            <Text style={styles.coordText}>
              LAT: {currentCoords.latitude?.toFixed(6)} | LNG: {currentCoords.longitude?.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Triggers & Settings Card */}
        <View style={[styles.sectionCard, { marginBottom: 16 }]}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color="#a5b4fc" />
            <Text style={styles.sectionTitle}>Multi-Modal Sensor Controls</Text>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Shake-to-SOS (Accelerometer)</Text>
              <Text style={styles.toggleSub}>Rapid shake triggers emergency state</Text>
            </View>
            <Switch
              value={shakeEnabled}
              onValueChange={setShakeEnabled}
              trackColor={{ false: '#374151', true: '#ef4444' }}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 }]}>
            <View>
              <Text style={styles.toggleLabel}>Voice-Trigger SOS</Text>
              <Text style={styles.toggleSub}>Monitors for urgent distress cry</Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: '#374151', true: '#ef4444' }}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 }]}>
            <View>
              <Text style={styles.toggleLabel}>Phase 2 Silent SMS</Text>
              <Text style={styles.toggleSub}>Requires custom dev-client build</Text>
            </View>
            <Switch
              value={usePhase2SMS}
              onValueChange={setUsePhase2SMS}
              trackColor={{ false: '#374151', true: '#10b981' }}
            />
          </View>
        </View>

        {/* Emergency Contacts Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Phone size={18} color="#f87171" />
            <Text style={styles.sectionTitle}>Emergency Contacts ({contacts.length})</Text>
          </View>

          {contacts.map((c) => (
            <View key={c.id} style={styles.contactItem}>
              <User size={18} color="#9ca3af" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
              </View>
              <CheckCircle size={16} color="#10b981" />
            </View>
          ))}

          {/* Add Contact Form */}
          <View style={styles.addContactBox}>
            <TextInput
              placeholder="Contact Name (e.g. Dad)"
              placeholderTextColor="#6b7280"
              value={newContactName}
              onChangeText={setNewContactName}
              style={styles.input}
            />
            <TextInput
              placeholder="Phone Number (+91...)"
              placeholderTextColor="#6b7280"
              keyboardType="phone-pad"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              style={styles.input}
            />
            <TouchableOpacity onPress={addContact} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17'
  },
  authWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  authLogoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5
  },
  authSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4
  },
  authCard: {
    backgroundColor: 'rgba(26, 34, 52, 0.7)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4
  },
  loginBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5
  },
  simBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  simActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.5)'
  },
  simText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700'
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  netOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderWidth: 1
  },
  netOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderWidth: 1
  },
  networkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  scrollContent: {
    padding: 20
  },
  sosCard: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(26, 34, 52, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20
  },
  sosPrompt: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center'
  },
  sosButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15
  },
  sosButtonIdle: {
    backgroundColor: '#ef4444'
  },
  sosButtonActive: {
    backgroundColor: '#10b981'
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6
  },
  sosSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 20
  },
  coordsCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  coordTitle: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '700'
  },
  coordText: {
    color: '#ffffff',
    fontFamily: 'monospace',
    fontSize: 13
  },
  sectionCard: {
    backgroundColor: 'rgba(26, 34, 52, 0.6)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  toggleSub: {
    color: '#9ca3af',
    fontSize: 11
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  contactName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  contactPhone: {
    color: '#9ca3af',
    fontSize: 12
  },
  addContactBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 8
  },
  addBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  addBtnText: {
    color: '#a5b4fc',
    fontWeight: '700',
    fontSize: 13
  }
});
