import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import {
  ChevronLeft, Clock, Shield, CheckCircle, XCircle,
  AlertTriangle, Navigation, RefreshCw
} from 'lucide-react-native';
import { BACKEND_URL } from '../config/firebaseConfig';
import { getLocalHistory } from '../services/storageService';

const STATUS_CONFIG = {
  RESOLVED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle, label: 'Resolved' },
  CANCELLED: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: XCircle, label: 'Cancelled' },
  CONFIRMED: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: CheckCircle, label: 'Confirmed' },
  SENDING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: AlertTriangle, label: 'Sending' },
  TRIGGERED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: AlertTriangle, label: 'Active' },
  ESCALATED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: AlertTriangle, label: 'Escalated' },
  FAILED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle, label: 'Failed' },
};

export default function HistoryScreen({ userProfile, navigate }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      if (userProfile?.uid) {
        const res = await fetch(`${BACKEND_URL}/api/sos/history/${userProfile.uid}`);
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setHistory(data.history);
          return;
        }
      }
    } catch (e) {
      // Fallback to local cache
    }
    // Local fallback
    const local = await getLocalHistory();
    setHistory(local);
  }, [userProfile?.uid]);

  useEffect(() => {
    fetchHistory().finally(() => setLoading(false));
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return null;
    const secs = Math.floor((end - start) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigate('Home')} style={s.backBtn}>
          <ChevronLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Emergency History</Text>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
          <RefreshCw size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#ef4444" size="large" />
          <Text style={s.loadingText}>Loading emergency history...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
        >
          {history.length === 0 ? (
            <View style={s.emptyState}>
              <Shield size={48} color="#1f2937" />
              <Text style={s.emptyTitle}>No Emergency History</Text>
              <Text style={s.emptyText}>
                All SOS activations will be recorded here with timestamps, location, and evidence.
              </Text>
            </View>
          ) : (
            <>
              <Text style={s.countLabel}>{history.length} incident{history.length !== 1 ? 's' : ''} recorded</Text>
              {history.map((session, i) => {
                const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.RESOLVED;
                const Icon = cfg.icon;
                return (
                  <View key={session.id || session.sessionId || i} style={[s.sessionCard, { borderLeftColor: cfg.color }]}>
                    <View style={s.sessionTop}>
                      <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Icon size={12} color={cfg.color} />
                        <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Text style={s.triggerType}>{session.triggerType || 'BUTTON'}</Text>
                    </View>

                    <Text style={s.sessionDate}>{formatDate(session.startedAt)}</Text>

                    <View style={s.metaGrid}>
                      <View style={s.metaItem}>
                        <Clock size={12} color="#4b5563" />
                        <Text style={s.metaText}>
                          {formatTime(session.startedAt)}
                          {session.endedAt ? ` → ${formatTime(session.endedAt)}` : ''}
                        </Text>
                      </View>
                      {session.endedAt && (
                        <View style={s.metaItem}>
                          <Text style={s.metaDuration}>{formatDuration(session.startedAt, session.endedAt)}</Text>
                        </View>
                      )}
                    </View>

                    {session.initialLocation && (
                      <View style={s.locationRow}>
                        <Navigation size={12} color="#06b6d4" />
                        <Text style={s.locationText}>
                          {session.initialLocation.latitude?.toFixed(4)}, {session.initialLocation.longitude?.toFixed(4)}
                        </Text>
                      </View>
                    )}

                    <View style={s.sessionBottom}>
                      <Text style={s.sessionId} numberOfLines={1}>
                        {(session.id || session.sessionId || '').slice(-16)}
                      </Text>
                      <Text style={s.networkMode}>{session.networkStateAtTrigger || 'ONLINE'}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#4b5563', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  countLabel: { color: '#4b5563', fontSize: 12, fontWeight: '600', marginBottom: 12, letterSpacing: 0.3 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#374151', fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyText: { color: '#1f2937', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  sessionCard: {
    backgroundColor: 'rgba(26,34,52,0.7)',
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3,
  },
  sessionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  triggerType: { color: '#374151', fontSize: 11, fontWeight: '600' },
  sessionDate: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  metaGrid: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#6b7280', fontSize: 12 },
  metaDuration: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  locationText: { color: '#06b6d4', fontSize: 11, fontFamily: 'monospace' },
  sessionBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sessionId: { color: '#1f2937', fontSize: 10, fontFamily: 'monospace', flex: 1 },
  networkMode: { color: '#374151', fontSize: 10, fontWeight: '600' },
});
