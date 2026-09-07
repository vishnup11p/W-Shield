import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Phone, User, Trash2, Plus, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react-native';
import { saveContacts } from '../services/storageService';
import { BACKEND_URL } from '../config/firebaseConfig';

export default function ContactsScreen({ contacts, setContacts, userProfile, navigate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncToBackend = async (updatedContacts) => {
    if (!userProfile?.uid) return;
    try {
      // Delete all and re-add is complex; we batch-add new ones only
      // For simplicity: POST each contact that doesn't have a backend ID
    } catch (e) {
      console.warn('[Contacts] Backend sync warning:', e.message);
    }
  };

  const addContact = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter contact name.'); return; }
    if (!phone.trim() || phone.trim().length < 6) { Alert.alert('Required', 'Please enter a valid phone number.'); return; }

    setAdding(true);
    const newContact = {
      id: `c_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim() || 'Contact',
      enabled: true,
      primary: contacts.length === 0,
    };

    // Persist to backend if online
    if (userProfile?.uid) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/contacts/${userProfile.uid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newContact.name, phone: newContact.phone, relationship: newContact.relationship }),
        });
        const data = await res.json();
        if (data.contactId) newContact.backendId = data.contactId;
      } catch (e) {
        console.warn('[Contacts] Backend add failed (offline):', e.message);
      }
    }

    const updated = [...contacts, newContact];
    setContacts(updated);
    await saveContacts(updated);
    setName(''); setPhone(''); setRelationship('');
    setAdding(false);
  };

  const removeContact = async (id) => {
    Alert.alert(
      'Remove Contact',
      'Remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const contact = contacts.find(c => c.id === id);
            // Remove from backend
            if (contact?.backendId && userProfile?.uid) {
              try {
                await fetch(`${BACKEND_URL}/api/contacts/${userProfile.uid}/${contact.backendId}`, { method: 'DELETE' });
              } catch (e) { /* offline */ }
            }
            const updated = contacts.filter(c => c.id !== id);
            setContacts(updated);
            await saveContacts(updated);
          }
        }
      ]
    );
  };

  const toggleContact = async (id) => {
    const updated = contacts.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
    setContacts(updated);
    await saveContacts(updated);
  };

  // Fetch contacts from backend on mount
  useEffect(() => {
    const fetchFromBackend = async () => {
      if (!userProfile?.uid) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/contacts/${userProfile.uid}`);
        const data = await res.json();
        if (data.contacts && data.contacts.length > 0) {
          const merged = data.contacts.map(bc => ({
            id: bc.id,
            backendId: bc.id,
            name: bc.name,
            phone: bc.phone,
            relationship: bc.relationship || 'Contact',
            enabled: true,
            primary: bc.priority === 1,
          }));
          setContacts(merged);
          await saveContacts(merged);
        }
      } catch (e) {
        // Offline — use locally cached contacts (already loaded)
      }
    };
    fetchFromBackend();
  }, [userProfile?.uid]);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Home')} style={s.backBtn}>
          <ChevronLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Emergency Contacts</Text>
        <View style={s.countBadge}><Text style={s.countText}>{contacts.length}</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {contacts.length === 0 && (
          <View style={s.emptyState}>
            <Phone size={40} color="#374151" />
            <Text style={s.emptyTitle}>No Contacts Yet</Text>
            <Text style={s.emptyText}>Add people to notify when you trigger SOS. They will receive your location and emergency ID.</Text>
          </View>
        )}

        {contacts.map((c) => (
          <View key={c.id} style={[s.contactCard, !c.enabled && s.contactDisabled]}>
            <View style={s.contactAvatar}>
              <User size={20} color="#9ca3af" />
            </View>
            <View style={s.contactInfo}>
              <View style={s.contactNameRow}>
                <Text style={s.contactName}>{c.name}</Text>
                {c.primary && <View style={s.primaryBadge}><Text style={s.primaryText}>PRIMARY</Text></View>}
              </View>
              <Text style={s.contactPhone}>{c.phone}</Text>
              {c.relationship && <Text style={s.contactRel}>{c.relationship}</Text>}
            </View>
            <View style={s.contactActions}>
              <TouchableOpacity onPress={() => toggleContact(c.id)} style={s.toggleBtn}>
                {c.enabled
                  ? <CheckCircle size={18} color="#10b981" />
                  : <AlertCircle size={18} color="#6b7280" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeContact(c.id)} style={s.deleteBtn}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Contact Form */}
        <View style={s.addCard}>
          <Text style={s.addTitle}>Add Emergency Contact</Text>

          <Text style={s.label}>Full Name *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Mom / Dad / Friend" placeholderTextColor="#374151" />

          <Text style={s.label}>Phone Number *</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor="#374151" keyboardType="phone-pad" />

          <Text style={s.label}>Relationship</Text>
          <TextInput style={s.input} value={relationship} onChangeText={setRelationship} placeholder="Mother / Brother / Friend" placeholderTextColor="#374151" />

          <TouchableOpacity style={s.addBtn} onPress={addContact} disabled={adding} activeOpacity={0.8}>
            {adding ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Plus size={18} color="#fff" />
                <Text style={s.addBtnText}>Add Contact</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.privacyNote}>
          ⚡ Contacts receive alerts only during active SOS. Disabled contacts are skipped.
        </Text>
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
  countBadge: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: '#f87171', fontWeight: '700', fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: '#6b7280', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyText: { color: '#374151', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 10,
  },
  contactDisabled: { opacity: 0.5 },
  contactAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  primaryBadge: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  primaryText: { color: '#f87171', fontSize: 9, fontWeight: '700' },
  contactPhone: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  contactRel: { color: '#4b5563', fontSize: 11 },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleBtn: { padding: 4 },
  deleteBtn: { padding: 4 },

  addCard: {
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginTop: 8,
  },
  addTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  label: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: '#fff', fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 13, marginTop: 16,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  privacyNote: { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
