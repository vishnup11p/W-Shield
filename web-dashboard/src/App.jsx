import React, { useState, useEffect } from 'react';
import { db, ref, onValue, BACKEND_URL } from './services/firebase';
import ActiveSessionMap from './components/ActiveSessionMap';
import EvidencePlayer from './components/EvidencePlayer';
import { Shield, Radio, CheckCircle, AlertTriangle, Phone, Battery, Wifi, Clock, AlertOctagon, RefreshCw } from 'lucide-react';

export default function App() {
  const [sessions, setSessions] = useState({});
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [pings, setPings] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [acknowledging, setAcknowledging] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Listen to all SOS sessions from Firebase Realtime Database
  useEffect(() => {
    try {
      const sessionsRef = ref(db, 'sosSessions');
      const unsubscribe = onValue(
        sessionsRef,
        (snapshot) => {
          setLoadingSessions(false);
          setErrorMsg(null);
          const val = snapshot.val();
          if (val) {
            setSessions(val);
            if (!selectedSessionId) {
              const keys = Object.keys(val);
              if (keys.length > 0) {
                setSelectedSessionId(keys[keys.length - 1]);
              }
            }
          } else {
            setSessions({});
          }
        },
        (err) => {
          console.warn('[Firebase RTDB] Connection notice:', err.message);
          setLoadingSessions(false);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      setLoadingSessions(false);
    }
  }, [selectedSessionId]);

  // 2. Listen to location pings for the selected session
  useEffect(() => {
    if (!selectedSessionId) return;
    try {
      const pingsRef = ref(db, `locationPings/${selectedSessionId}`);
      const unsubscribe = onValue(pingsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.entries(val).map(([id, ping]) => ({ id, ...ping }));
          list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          setPings(list);
        } else {
          setPings([]);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Location pings listener error:', e);
    }
  }, [selectedSessionId]);

  // 3. Listen to evidence chunks for the selected session
  useEffect(() => {
    if (!selectedSessionId) return;
    try {
      const evRef = ref(db, `evidence/${selectedSessionId}`);
      const unsubscribe = onValue(evRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.entries(val).map(([id, ev]) => ({ id, ...ev }));
          setEvidenceList(list);
        } else {
          setEvidenceList([]);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Evidence listener error:', e);
    }
  }, [selectedSessionId]);

  const activeSession = selectedSessionId ? sessions[selectedSessionId] : null;

  // Handle emergency contact Acknowledgment
  const handleAcknowledge = async () => {
    if (!selectedSessionId) return;
    setAcknowledging(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sos/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          contactId: 'dashboard_responder',
          contactName: 'Emergency Responder / Family'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => ({
          ...prev,
          [selectedSessionId]: {
            ...prev[selectedSessionId],
            status: 'CONFIRMED',
            acknowledgedBy: data.acknowledgedBy
          }
        }));
      }
    } catch (err) {
      alert('Could not reach backend API: ' + err.message);
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}>
            <Shield size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              SafeGuard <span style={{ color: 'var(--accent-red)', fontSize: '1.2rem', fontWeight: 600 }}>MONITOR</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Network-Adaptive Emergency Response & Family Live-Tracking Dashboard
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.85rem', color: '#34d399' }}>
            <Radio size={14} className="pulse-emergency" />
            <span>Realtime Gateway Active</span>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Sidebar: Session List */}
        <aside className="glass-panel" style={{ padding: '20px', height: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Active Incidents</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
              {Object.keys(sessions).length} Total
            </span>
          </h2>

          {loadingSessions ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="pulse-emergency" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '0.85rem' }}>Connecting to Realtime Database...</p>
            </div>
          ) : Object.keys(sessions).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              No active SOS alerts currently logged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(sessions).map(([id, session]) => {
                const isSelected = id === selectedSessionId;
                const isOngoing = session.status === 'TRIGGERED' || session.status === 'SENDING' || session.status === 'ESCALATED';
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedSessionId(id)}
                    className={isOngoing ? 'pulse-emergency' : ''}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                        {session.victimName || 'Anonymous'}
                      </span>
                      <span className={`status-badge status-${session.status}`}>
                        {session.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} /> {session.victimPhone || 'No Phone'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} /> {new Date(session.startedAt || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Section: Active SOS Details & Live Map */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeSession ? (
            <>
              {/* Emergency Banner Card */}
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderLeft: `6px solid ${activeSession.status === 'ESCALATED' ? '#f59e0b' : 'var(--accent-red)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                        {activeSession.victimName} ({activeSession.victimPhone})
                      </h2>
                      <span className={`status-badge status-${activeSession.status}`}>
                        {activeSession.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wifi size={14} color="var(--accent-cyan)" /> Mode: <strong style={{ color: '#fff' }}>{activeSession.networkStateAtTrigger}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Battery size={14} color="var(--accent-emerald)" /> Battery: <strong style={{ color: '#fff' }}>{Math.round((activeSession.batteryLevel || 1) * 100)}%</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Trigger: <strong style={{ color: 'var(--accent-amber)' }}>{activeSession.triggerType}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Acknowledge Button */}
                  <div>
                    {activeSession.status !== 'CONFIRMED' && activeSession.status !== 'RESOLVED' ? (
                      <button
                        onClick={handleAcknowledge}
                        disabled={acknowledging}
                        className="btn-ack"
                      >
                        <CheckCircle size={18} />
                        {acknowledging ? 'Confirming...' : 'Acknowledge SOS Alert'}
                      </button>
                    ) : (
                      <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 16px', borderRadius: '10px', color: '#34d399', fontSize: '0.88rem' }}>
                        ✓ Acknowledged by: <strong>{activeSession.acknowledgedBy?.contactName || 'Family'}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map & Live Location */}
              <ActiveSessionMap
                pings={pings}
                initialLocation={activeSession.initialLocation}
                victimName={activeSession.victimName}
              />

              {/* Evidence Player Section */}
              <EvidencePlayer evidenceList={evidenceList} />
            </>
          ) : (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Shield size={48} color="var(--accent-indigo)" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                SafeGuard Emergency Operations Center
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
                No incident currently selected. Trigger an SOS alert from the mobile application or select an active session from the left sidebar.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
