import React, { useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Alert
} from 'react-native';
import { ChevronLeft, Activity, Mic, Smartphone, MessageSquare, Shield, AlertTriangle, Info } from 'lucide-react-native';
import { saveSettings } from '../services/storageService';

const COUNTDOWN_OPTIONS = [3, 5, 10, 15];

export default function SettingsScreen({ settings, setSettings, navigate }) {
  const [localSettings, setLocalSettings] = useState(settings || {
    shakeEnabled: true,
    voiceEnabled: false,
    fallDetectionEnabled: false,
    countdownSeconds: 5,
    shakeSensitivity: 2.4,
    smsPhase2Enabled: false,
    evidenceRecordingEnabled: true,
    locationSharingEnabled: true,
  });

  const update = async (key, value) => {
    // Warn before disabling critical safety features
    if ((key === 'shakeEnabled' || key === 'locationSharingEnabled') && !value) {
      Alert.alert(
        '⚠️ Safety Warning',
        `Disabling ${key === 'shakeEnabled' ? 'Shake SOS' : 'Location Sharing'} reduces your safety coverage. Are you sure?`,
        [
          { text: 'Keep Enabled', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const updated = { ...localSettings, [key]: value };
              setLocalSettings(updated);
              setSettings(updated);
              await saveSettings(updated);
            }
          }
        ]
      );
      return;
    }

    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    setSettings(updated);
    await saveSettings(updated);
  };

  const ToggleRow = ({ icon, title, subtitle, settingKey, devBuildOnly }) => (
    <View style={s.toggleRow}>
      <View style={s.toggleIcon}>{icon}</View>
      <View style={s.toggleInfo}>
        <Text style={s.toggleTitle}>{title}</Text>
        <Text style={s.toggleSub}>{devBuildOnly ? '⚙️ Requires development build' : subtitle}</Text>
      </View>
      <Switch
        value={!!localSettings[settingKey]}
        onValueChange={(v) => update(settingKey, v)}
        trackColor={{ false: '#1f2937', true: '#ef4444' }}
        thumbColor={localSettings[settingKey] ? '#fff' : '#4b5563'}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Home')} style={s.backBtn}>
          <ChevronLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Safety Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* SOS Triggers */}
        <Text style={s.sectionLabel}>SOS TRIGGER METHODS</Text>
        <View style={s.card}>
          <ToggleRow
            icon={<Activity size={20} color="#a5b4fc" />}
            title="Shake-to-SOS"
            subtitle="Rapid phone shake triggers emergency"
            settingKey="shakeEnabled"
          />
          <View style={s.divider} />
          <ToggleRow
            icon={<Mic size={20} color="#f87171" />}
            title="Voice SOS"
            subtitle="High-amplitude distress sound detection"
            settingKey="voiceEnabled"
            devBuildOnly
          />
          <View style={s.divider} />
          <ToggleRow
            icon={<Smartphone size={20} color="#fbbf24" />}
            title="Fall Detection"
            subtitle="Detect potential falls via accelerometer"
            settingKey="fallDetectionEnabled"
          />
        </View>

        {/* Countdown */}
        <Text style={s.sectionLabel}>SOS COUNTDOWN</Text>
        <View style={s.card}>
          <Text style={s.optionLabel}>Countdown before SOS activates</Text>
          <View style={s.countdownRow}>
            {COUNTDOWN_OPTIONS.map(secs => (
              <TouchableOpacity
                key={secs}
                style={[s.countdownBtn, localSettings.countdownSeconds === secs && s.countdownBtnActive]}
                onPress={() => update('countdownSeconds', secs)}
              >
                <Text style={[s.countdownText, localSettings.countdownSeconds === secs && s.countdownTextActive]}>
                  {secs}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.optionSub}>You can cancel during the countdown by tapping the SOS button again.</Text>
        </View>

        {/* Evidence & Location */}
        <Text style={s.sectionLabel}>PRIVACY & EVIDENCE</Text>
        <View style={s.card}>
          <ToggleRow
            icon={<Shield size={20} color="#34d399" />}
            title="Evidence Recording"
            subtitle="Record audio evidence during SOS"
            settingKey="evidenceRecordingEnabled"
          />
          <View style={s.divider} />
          <ToggleRow
            icon={<Shield size={20} color="#06b6d4" />}
            title="Location Sharing"
            subtitle="Share GPS with emergency contacts"
            settingKey="locationSharingEnabled"
          />
        </View>

        {/* SMS */}
        <Text style={s.sectionLabel}>SMS FALLBACK</Text>
        <View style={s.card}>
          <ToggleRow
            icon={<MessageSquare size={20} color="#a78bfa" />}
            title="Silent SMS (Phase 2)"
            subtitle="Automatic SMS without share sheet"
            settingKey="smsPhase2Enabled"
            devBuildOnly
          />
          <View style={s.infoBox}>
            <Info size={14} color="#4b5563" />
            <Text style={s.infoText}>
              Phase 1 SMS (share sheet) works in Expo Go. Silent background SMS requires an EAS development build.
            </Text>
          </View>
        </View>

        {/* Platform Notes */}
        <View style={s.warningCard}>
          <AlertTriangle size={16} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={s.warningTitle}>Platform Limitations</Text>
            <Text style={s.warningText}>Voice SOS and audio evidence recording require a development build (not Expo Go). Background GPS tracking may be limited by Android battery optimization. Shake and button SOS work in Expo Go.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { color: '#374151', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },

  card: {
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  toggleInfo: { flex: 1 },
  toggleTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleSub: { color: '#4b5563', fontSize: 11, marginTop: 2 },

  optionLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 14, marginBottom: 10 },
  optionSub: { color: '#374151', fontSize: 11, marginBottom: 14, lineHeight: 16 },
  countdownRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countdownBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  countdownBtnActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  countdownText: { color: '#4b5563', fontWeight: '700', fontSize: 14 },
  countdownTextActive: { color: '#ef4444' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10, padding: 10, margin: 10, marginTop: 0,
  },
  infoText: { flex: 1, color: '#4b5563', fontSize: 11, lineHeight: 16 },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 14, padding: 14, marginTop: 16,
  },
  warningTitle: { color: '#f59e0b', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  warningText: { color: '#78716c', fontSize: 12, lineHeight: 18 },
});
