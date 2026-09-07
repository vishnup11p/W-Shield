import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { ChevronLeft, User, Phone, Mail, LogOut, Save, Shield } from 'lucide-react-native';
import { logoutUser } from '../services/authService';
import { saveUserProfile } from '../services/storageService';
import { BACKEND_URL } from '../config/firebaseConfig';

export default function ProfileScreen({ userProfile, setUserProfile, navigate, onLogout }) {
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const updated = { ...userProfile, name: name.trim(), phone: phone.trim() };

      // Update on backend
      if (userProfile?.uid) {
        try {
          await fetch(`${BACKEND_URL}/auth/profile/${userProfile.uid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: updated.name, phone: updated.phone }),
          });
        } catch (e) {
          console.warn('[Profile] Backend update failed:', e.message);
        }
      }

      await saveUserProfile(updated);
      setUserProfile(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', 'Could not save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
            } catch (e) {}
            onLogout();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Home')} style={s.backBtn}>
          <ChevronLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarCircle}>
            <Shield size={40} color="#ef4444" />
          </View>
          <Text style={s.avatarName}>{userProfile?.name || 'SafeGuard User'}</Text>
          <Text style={s.avatarUid} numberOfLines={1}>UID: {userProfile?.uid?.slice(-12) || 'demo'}</Text>
        </View>

        {/* Edit Form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Personal Information</Text>

          <View style={s.fieldRow}>
            <User size={16} color="#6b7280" />
            <Text style={s.label}>Full Name</Text>
          </View>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#374151"
            autoCapitalize="words"
          />

          <View style={s.fieldRow}>
            <Phone size={16} color="#6b7280" />
            <Text style={s.label}>Phone Number</Text>
          </View>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#374151"
            keyboardType="phone-pad"
          />

          <View style={s.fieldRow}>
            <Mail size={16} color="#6b7280" />
            <Text style={s.label}>Email (from auth)</Text>
          </View>
          <View style={s.inputReadonly}>
            <Text style={s.readonlyText}>{userProfile?.email || 'Not set'}</Text>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Save size={16} color="#fff" />
                <Text style={s.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>About SafeGuard</Text>
          <Text style={s.infoText}>Version 1.0.0 • Network-Adaptive Women Safety System</Text>
          <Text style={s.infoText}>Your location is never shared unless you activate SOS.</Text>
          <Text style={s.infoText}>Evidence recordings are encrypted and accessible only to you and your emergency contacts.</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#ef4444" />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>

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

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 2, borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatarUid: { color: '#374151', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },

  formCard: {
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 14,
  },
  formTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 5 },
  label: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: '#fff', fontSize: 14,
  },
  inputReadonly: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  readonlyText: { color: '#4b5563', fontSize: 14 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 13, marginTop: 18,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  infoCard: {
    backgroundColor: 'rgba(26,34,52,0.5)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 14, gap: 6,
  },
  infoTitle: { color: '#6b7280', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  infoText: { color: '#374151', fontSize: 12, lineHeight: 18 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 14, paddingVertical: 14,
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
