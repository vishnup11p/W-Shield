import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Shield } from 'lucide-react-native';
import { registerUser, loginUser } from '../services/authService';
import { saveContacts, saveSettings } from '../services/storageService';

const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Mom', phone: '+919876543210', relationship: 'Mother', enabled: true },
];

const DEFAULT_SETTINGS = {
  shakeEnabled: true,
  voiceEnabled: false,
  fallDetectionEnabled: false,
  countdownSeconds: 5,
  smsPhase2Enabled: false,
  evidenceRecordingEnabled: true,
  locationSharingEnabled: true,
};

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'register') {
        result = await registerUser(email.trim(), password, name.trim(), phone.trim());
        // Initialize default contacts and settings for new users
        await saveContacts(DEFAULT_CONTACTS);
        await saveSettings(DEFAULT_SETTINGS);
      } else {
        result = await loginUser(email.trim(), password);
      }
      onAuthenticated(result.profile);
    } catch (err) {
      let msg = err.message || 'Authentication failed';
      if (msg.includes('email-already-in-use')) msg = 'An account with this email already exists. Please login.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) msg = 'Invalid email or password.';
      if (msg.includes('network-request-failed')) msg = 'No internet connection. Please try again.';
      Alert.alert('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Shield size={44} color="#ef4444" />
            </View>
            <Text style={s.title}>SafeGuard</Text>
            <Text style={s.subtitle}>Network-Adaptive Women Safety System</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Tab Switcher */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, mode === 'login' && s.tabActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, mode === 'register' && s.tabActive]}
                onPress={() => setMode('register')}
              >
                <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <>
                <Text style={s.label}>Full Name</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Jane Doe"
                  placeholderTextColor="#4b5563"
                  autoCapitalize="words"
                />
                <Text style={s.label}>Phone Number</Text>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#4b5563"
                  keyboardType="phone-pad"
                />
              </>
            )}

            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#4b5563"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              placeholderTextColor="#4b5563"
              secureTextEntry
            />

            <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>{mode === 'register' ? 'Create Account' : 'Login'}</Text>
              )}
            </TouchableOpacity>

            <Text style={s.hint}>
              {mode === 'login'
                ? "Don't have an account? Tap Register above."
                : 'Already have an account? Tap Login above.'}
            </Text>
          </View>

          <Text style={s.footer}>
            Your data is protected. Only emergency contacts see your location during an SOS.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(26,34,52,0.8)',
    borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ef4444' },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  label: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    color: '#fff', fontSize: 14, marginBottom: 4,
  },
  btn: {
    backgroundColor: '#ef4444', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 18,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: { color: '#4b5563', fontSize: 12, textAlign: 'center', marginTop: 14 },
  footer: { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
