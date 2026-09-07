import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator, Linking
} from 'react-native';
import {
  ChevronLeft, FileAudio, ExternalLink, ShieldCheck,
  Upload, Clock, FileX, RefreshCw
} from 'lucide-react-native';
import { BACKEND_URL } from '../config/firebaseConfig';

export default function EvidenceScreen({ activeSessionId, userProfile, navigate }) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(activeSessionId);
  const [inputSessionId, setInputSessionId] = useState('');

  const fetchEvidence = async (sid) => {
    if (!sid) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/evidence/${sid}`);
      const data = await res.json();
      setEvidence(data.evidence || []);
    } catch (e) {
      console.warn('[Evidence] Fetch failed:', e.message);
      setEvidence([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSessionId) {
      setSessionId(activeSessionId);
      fetchEvidence(activeSessionId);
    }
  }, [activeSessionId]);

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDuration = (ms) => {
    if (!ms) return null;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Home')} style={s.backBtn}>
          <ChevronLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Evidence</Text>
        {sessionId && (
          <TouchableOpacity onPress={() => fetchEvidence(sessionId)} style={s.refreshBtn}>
            <RefreshCw size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Session Info */}
        {sessionId ? (
          <View style={s.sessionCard}>
            <ShieldCheck size={16} color="#10b981" />
            <Text style={s.sessionText} numberOfLines={2}>
              Session: {sessionId}
            </Text>
          </View>
        ) : (
          <View style={s.noSession}>
            <FileX size={40} color="#374151" />
            <Text style={s.noSessionTitle}>No Active Session</Text>
            <Text style={s.noSessionText}>
              Evidence is collected during an active SOS emergency. Trigger SOS to begin recording.
            </Text>
          </View>
        )}

        {/* Evidence List */}
        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator color="#06b6d4" size="large" />
            <Text style={s.loadingText}>Loading evidence...</Text>
          </View>
        ) : evidence.length === 0 && sessionId ? (
          <View style={s.emptyEvidence}>
            <Upload size={32} color="#374151" />
            <Text style={s.emptyTitle}>No Evidence Yet</Text>
            <Text style={s.emptyText}>Audio chunks will appear here once recording starts during SOS.</Text>
          </View>
        ) : (
          <>
            {evidence.map((ev, i) => (
              <View key={ev.id || i} style={s.evidenceCard}>
                <View style={s.evIcon}>
                  <FileAudio size={20} color="#06b6d4" />
                </View>
                <View style={s.evInfo}>
                  <Text style={s.evTitle}>
                    {ev.type === 'AUDIO_CHUNK' ? `Audio Chunk #${ev.chunkIndex || i + 1}` : ev.type}
                  </Text>
                  <View style={s.evMeta}>
                    {formatDuration(ev.durationMs) && (
                      <View style={s.metaItem}>
                        <Clock size={10} color="#4b5563" />
                        <Text style={s.metaText}>{formatDuration(ev.durationMs)}</Text>
                      </View>
                    )}
                    <Text style={s.metaText}>{formatSize(ev.sizeBytes)}</Text>
                    <Text style={s.metaText}>{new Date(ev.createdAt || Date.now()).toLocaleTimeString()}</Text>
                  </View>
                </View>
                <View style={s.evStatus}>
                  {ev.downloadUrl && ev.downloadUrl.startsWith('http') ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(ev.downloadUrl)}
                      style={s.playBtn}
                    >
                      <ExternalLink size={14} color="#06b6d4" />
                      <Text style={s.playText}>Open</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.uploadedBadge}>
                      <Text style={s.uploadedText}>Local</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {evidence.length > 0 && (
          <Text style={s.privacyNote}>
            🔒 Evidence is stored securely. Only authorized contacts and authorities can access.
          </Text>
        )}
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
  refreshBtn: { padding: 4 },
  scroll: { padding: 16, paddingBottom: 40 },

  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  sessionText: { flex: 1, color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' },

  noSession: { alignItems: 'center', paddingVertical: 40 },
  noSessionTitle: { color: '#6b7280', fontSize: 16, fontWeight: '600', marginTop: 12 },
  noSessionText: { color: '#374151', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  loading: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { color: '#4b5563', fontSize: 13 },

  emptyEvidence: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { color: '#6b7280', fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptyText: { color: '#374151', fontSize: 12, textAlign: 'center', marginTop: 8 },

  evidenceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  evIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  evInfo: { flex: 1 },
  evTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  evMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: '#4b5563', fontSize: 11 },
  evStatus: { alignItems: 'flex-end' },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  playText: { color: '#06b6d4', fontSize: 12, fontWeight: '600' },
  uploadedBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  uploadedText: { color: '#34d399', fontSize: 11 },
  privacyNote: { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
