import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Animated, Vibration, Alert
} from 'react-native';
import {
  Shield, Wifi, WifiOff, Navigation, Phone, Settings,
  FileText, Clock, User, AlertTriangle, CheckCircle, Activity
} from 'lucide-react-native';

export default function HomeScreen({
  userProfile,
  contacts,
  networkStatus,
  currentCoords,
  sosState,
  countdown,
  settings,
  onTriggerSOS,
  onCancelCountdown,
  navigate,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isSOSActive = sosState === 'TRIGGERED' || sosState === 'SENDING' || sosState === 'CONFIRMED';
  const isCountingDown = sosState === 'COUNTDOWN';

  // Pulsing animation for SOS button during countdown
  useEffect(() => {
    if (isCountingDown) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCountingDown]);

  const getNetworkIcon = () => {
    if (networkStatus === 'ONLINE') return <Wifi size={14} color="#10b981" />;
    if (networkStatus === 'POOR') return <Wifi size={14} color="#f59e0b" />;
    return <WifiOff size={14} color="#ef4444" />;
  };

  const getNetworkColor = () => {
    if (networkStatus === 'ONLINE') return '#10b981';
    if (networkStatus === 'POOR') return '#f59e0b';
    return '#ef4444';
  };

  const contactsConfigured = contacts && contacts.length > 0;

  const handleSOSPress = () => {
    if (isSOSActive) {
      navigate('EmergencyActive');
      return;
    }
    if (isCountingDown) {
      onCancelCountdown();
      return;
    }
    Vibration.vibrate(100);
    onTriggerSOS('BUTTON');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.brandRow}>
          <Shield size={26} color="#ef4444" />
          <Text style={s.brandTitle}>SafeGuard</Text>
        </View>
        <TouchableOpacity onPress={() => navigate('Profile')} style={s.avatarBtn}>
          <User size={18} color="#9ca3af" />
          <Text style={s.avatarName} numberOfLines={1}>{userProfile?.name?.split(' ')[0] || 'You'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Status Bar */}
        <View style={s.statusBar}>
          <View style={s.statusItem}>
            {getNetworkIcon()}
            <Text style={[s.statusText, { color: getNetworkColor() }]}>
              {networkStatus === 'ONLINE' ? 'ONLINE' : networkStatus === 'POOR' ? 'WEAK' : 'OFFLINE'}
            </Text>
          </View>
          <View style={s.statusDivider} />
          <View style={s.statusItem}>
            <Navigation size={14} color={currentCoords ? '#06b6d4' : '#6b7280'} />
            <Text style={[s.statusText, { color: currentCoords ? '#06b6d4' : '#6b7280' }]}>
              {currentCoords ? 'GPS OK' : 'NO GPS'}
            </Text>
          </View>
          <View style={s.statusDivider} />
          <View style={s.statusItem}>
            <Phone size={14} color={contactsConfigured ? '#10b981' : '#ef4444'} />
            <Text style={[s.statusText, { color: contactsConfigured ? '#10b981' : '#ef4444' }]}>
              {contactsConfigured ? `${contacts.length} CONTACTS` : 'NO CONTACTS'}
            </Text>
          </View>
        </View>

        {/* Contacts Warning */}
        {!contactsConfigured && (
          <TouchableOpacity style={s.warningBanner} onPress={() => navigate('Contacts')}>
            <AlertTriangle size={16} color="#f59e0b" />
            <Text style={s.warningText}>Add emergency contacts so we can alert them during SOS</Text>
          </TouchableOpacity>
        )}

        {/* SOS Button */}
        <View style={s.sosCard}>
          <Text style={s.sosPrompt}>
            {isCountingDown
              ? `SENDING SOS IN ${countdown}s...`
              : isSOSActive
              ? '⚡ EMERGENCY ACTIVE — TAP TO VIEW'
              : 'PRESS FOR EMERGENCY SOS'}
          </Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                s.sosBtn,
                isSOSActive ? s.sosBtnActive : isCountingDown ? s.sosBtnCountdown : s.sosBtnIdle
              ]}
              onPress={handleSOSPress}
              activeOpacity={0.85}
            >
              <Shield size={52} color="#fff" />
              <Text style={s.sosBtnLabel}>
                {isCountingDown ? countdown : isSOSActive ? 'ACTIVE' : 'SOS'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={s.sosHint}>
            {isCountingDown
              ? 'Tap to CANCEL'
              : isSOSActive
              ? 'Emergency in progress'
              : settings?.shakeEnabled
              ? 'Shake phone · Voice trigger armed'
              : 'Tap to send emergency alert'}
          </Text>
        </View>

        {/* GPS Coords */}
        {currentCoords && (
          <View style={s.coordCard}>
            <Navigation size={14} color="#06b6d4" />
            <Text style={s.coordText}>
              {currentCoords.latitude?.toFixed(5)}, {currentCoords.longitude?.toFixed(5)}
            </Text>
            <Text style={s.coordAcc}>±{currentCoords.accuracy?.toFixed(0) || '?'}m</Text>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={s.sectionLabel}>QUICK ACCESS</Text>
        <View style={s.quickGrid}>
          <QuickCard icon={<Phone size={22} color="#f87171" />} label="Emergency Contacts" count={contacts.length} onPress={() => navigate('Contacts')} />
          <QuickCard icon={<Navigation size={22} color="#06b6d4" />} label="Live Tracking" onPress={() => navigate('EmergencyActive')} />
          <QuickCard icon={<FileText size={22} color="#a5b4fc" />} label="Evidence" onPress={() => navigate('Evidence')} />
          <QuickCard icon={<Clock size={22} color="#34d399" />} label="History" onPress={() => navigate('History')} />
          <QuickCard icon={<Settings size={22} color="#9ca3af" />} label="Safety Settings" onPress={() => navigate('Settings')} />
          <QuickCard icon={<Activity size={22} color="#fbbf24" />} label="Sensor Status" label2={settings?.shakeEnabled ? 'Shake: ON' : 'Shake: OFF'} onPress={() => navigate('Settings')} />
        </View>

        {/* Active session notice */}
        {isSOSActive && (
          <TouchableOpacity style={s.activeBanner} onPress={() => navigate('EmergencyActive')}>
            <View style={s.activeDot} />
            <Text style={s.activeBannerText}>Emergency session in progress — Tap to monitor</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function QuickCard({ icon, label, label2, count, onPress }) {
  return (
    <TouchableOpacity style={s.quickCard} onPress={onPress} activeOpacity={0.75}>
      <View style={s.quickIcon}>{icon}</View>
      <Text style={s.quickLabel} numberOfLines={2}>{label}</Text>
      {count !== undefined && (
        <View style={s.quickBadge}><Text style={s.quickBadgeText}>{count}</Text></View>
      )}
      {label2 && <Text style={s.quickSub}>{label2}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  avatarName: { color: '#9ca3af', fontSize: 13, fontWeight: '600', maxWidth: 80 },
  scroll: { padding: 16, paddingBottom: 32 },

  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 12,
  },
  statusItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  statusDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  warningText: { flex: 1, color: '#f59e0b', fontSize: 12 },

  sosCard: {
    alignItems: 'center', paddingVertical: 36,
    backgroundColor: 'rgba(26,34,52,0.6)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14,
  },
  sosPrompt: { color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 24, textAlign: 'center' },
  sosBtn: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 12,
  },
  sosBtnIdle: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
  sosBtnCountdown: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
  sosBtnActive: { backgroundColor: '#10b981', shadowColor: '#10b981' },
  sosBtnLabel: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 6 },
  sosHint: { color: '#4b5563', fontSize: 12, marginTop: 20, textAlign: 'center' },

  coordCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14,
  },
  coordText: { flex: 1, color: '#06b6d4', fontSize: 12, fontFamily: 'monospace' },
  coordAcc: { color: '#374151', fontSize: 11 },

  sectionLabel: { color: '#374151', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  quickCard: {
    width: '47%', backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  quickIcon: { marginBottom: 10 },
  quickLabel: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  quickSub: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  quickBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  quickBadgeText: { color: '#f87171', fontSize: 11, fontWeight: '700' },

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 12, padding: 14,
  },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },
  activeBannerText: { flex: 1, color: '#34d399', fontSize: 13, fontWeight: '600' },
});
