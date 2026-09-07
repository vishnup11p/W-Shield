import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  ScrollView, Animated, Vibration, Alert
} from 'react-native';
import {
  Shield, Navigation, Wifi, WifiOff, Mic, MicOff, Phone,
  Clock, AlertOctagon, CheckCircle, X, Radio
} from 'lucide-react-native';

export default function EmergencyActiveScreen({
  sosState,
  sessionId,
  currentCoords,
  networkStatus,
  contacts,
  userProfile,
  recordingStatus,
  nearbyCount,
  elapsedSeconds,
  onResolveSOS,
  navigate,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [confirmResolve, setConfirmResolve] = useState(false);

  // Pulsing red aura for active emergency
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleResolvePress = () => {
    if (!confirmResolve) {
      setConfirmResolve(true);
      setTimeout(() => setConfirmResolve(false), 4000); // auto-reset
      return;
    }
    Vibration.vibrate([0, 100, 100, 100]);
    onResolveSOS();
  };

  const isActive = sosState === 'CONFIRMED' || sosState === 'SENDING' || sosState === 'TRIGGERED';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Home')} style={s.backBtn}>
          <X size={20} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Emergency Active</Text>
        <Animated.View style={[s.liveDot, { transform: [{ scale: pulseAnim }] }]} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Emergency ID + Status */}
        <View style={s.emergencyCard}>
          <View style={s.emergencyIdRow}>
            <Radio size={16} color="#ef4444" />
            <Text style={s.emergencyIdText} numberOfLines={1}>
              {sessionId ? `ID: ${sessionId.slice(-12)}` : 'Initializing...'}
            </Text>
            <View style={[s.statusPill, isActive ? s.pillActive : s.pillResolved]}>
              <Text style={s.pillText}>{sosState}</Text>
            </View>
          </View>

          {/* Elapsed Timer */}
          <Text style={s.timerLabel}>ELAPSED TIME</Text>
          <Text style={s.timerText}>{formatElapsed(elapsedSeconds)}</Text>
        </View>

        {/* Location Card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Navigation size={18} color="#06b6d4" />
            <Text style={s.infoTitle}>Live GPS Location</Text>
          </View>
          {currentCoords ? (
            <>
              <Text style={s.coordText}>
                {currentCoords.latitude?.toFixed(6)}, {currentCoords.longitude?.toFixed(6)}
              </Text>
              <Text style={s.coordSub}>
                Accuracy: ±{currentCoords.accuracy?.toFixed(0) || '?'}m
              </Text>
            </>
          ) : (
            <Text style={s.coordText}>Acquiring GPS...</Text>
          )}
        </View>

        {/* Network Status */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            {networkStatus === 'ONLINE'
              ? <Wifi size={18} color="#10b981" />
              : <WifiOff size={18} color="#ef4444" />}
            <Text style={s.infoTitle}>Network Mode</Text>
          </View>
          <Text style={[s.coordText, { color: networkStatus === 'ONLINE' ? '#10b981' : '#ef4444' }]}>
            {networkStatus === 'ONLINE'
              ? 'Internet Active — Real-time alerts sent'
              : networkStatus === 'POOR'
              ? 'Weak Network — SMS fallback active'
              : 'OFFLINE — SMS fallback dispatched'}
          </Text>
        </View>

        {/* Contacts Notified */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Phone size={18} color="#f87171" />
            <Text style={s.infoTitle}>Emergency Contacts Notified</Text>
          </View>
          {contacts && contacts.length > 0 ? (
            contacts.map((c) => (
              <View key={c.id} style={s.contactRow}>
                <CheckCircle size={14} color="#10b981" />
                <Text style={s.contactRowText}>{c.name} — {c.phone}</Text>
              </View>
            ))
          ) : (
            <Text style={s.coordSub}>No emergency contacts configured</Text>
          )}
        </View>

        {/* Nearby Users */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <AlertOctagon size={18} color="#f59e0b" />
            <Text style={s.infoTitle}>Nearby Users Alerted</Text>
          </View>
          <Text style={s.coordText}>
            {nearbyCount > 0 ? `${nearbyCount} user(s) within 1km notified` : 'Scanning for nearby users...'}
          </Text>
        </View>

        {/* Recording Status */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            {recordingStatus === 'RECORDING'
              ? <Mic size={18} color="#ef4444" />
              : <MicOff size={18} color="#6b7280" />}
            <Text style={s.infoTitle}>Evidence Recording</Text>
          </View>
          <Text style={[s.coordText, { color: recordingStatus === 'RECORDING' ? '#ef4444' : '#6b7280' }]}>
            {recordingStatus === 'RECORDING'
              ? 'Audio evidence recording & uploading...'
              : recordingStatus === 'UNAVAILABLE'
              ? 'Requires development build (not Expo Go)'
              : 'Standby'}
          </Text>
        </View>

        {/* Resolve Button */}
        <TouchableOpacity
          style={[s.resolveBtn, confirmResolve && s.resolveBtnConfirm]}
          onPress={handleResolvePress}
          activeOpacity={0.85}
        >
          <Shield size={20} color="#fff" />
          <Text style={s.resolveBtnText}>
            {confirmResolve ? 'TAP AGAIN TO CONFIRM CANCEL' : 'CANCEL / RESOLVE EMERGENCY'}
          </Text>
        </TouchableOpacity>

        <Text style={s.resolveHint}>
          You must tap twice to prevent accidental cancellation
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowRadius: 8, shadowOpacity: 0.8, elevation: 4 },
  scroll: { padding: 16, paddingBottom: 40 },

  emergencyCard: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 20, padding: 20, marginBottom: 12, alignItems: 'center',
  },
  emergencyIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emergencyIdText: { flex: 1, color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillActive: { backgroundColor: 'rgba(239,68,68,0.2)' },
  pillResolved: { backgroundColor: 'rgba(107,114,128,0.2)' },
  pillText: { color: '#f87171', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  timerLabel: { color: '#4b5563', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  timerText: { fontSize: 52, fontWeight: '900', color: '#ef4444', fontFamily: 'monospace', letterSpacing: 2 },

  infoCard: {
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  coordText: { color: '#06b6d4', fontSize: 13, fontFamily: 'monospace' },
  coordSub: { color: '#4b5563', fontSize: 11, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  contactRowText: { color: '#9ca3af', fontSize: 13 },

  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  resolveBtnConfirm: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: 'rgba(239,68,68,0.5)',
  },
  resolveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  resolveHint: { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 10 },
});
