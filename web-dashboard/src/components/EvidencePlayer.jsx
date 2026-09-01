import React from 'react';
import { Volume2, Video, FileAudio, ExternalLink, ShieldCheck } from 'lucide-react';

export default function EvidencePlayer({ evidenceList = [] }) {
  if (evidenceList.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
        <ShieldCheck size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
        <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '4px' }}>Cloud Evidence Recording</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Real-time audio & sensor chunks are uploaded progressively to Firebase Storage on SOS trigger.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileAudio size={18} color="var(--accent-cyan)" />
        Recorded Evidence Chunks ({evidenceList.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
        {evidenceList.map((ev, index) => (
          <div
            key={ev.id || index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Volume2 size={16} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#fff' }}>
                  Audio Chunk #{ev.chunkIndex || index + 1}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {ev.durationMs ? `${(ev.durationMs / 1000).toFixed(1)}s • ` : ''}{new Date(ev.createdAt || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {ev.downloadUrl ? (
              <a
                href={ev.downloadUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'var(--accent-cyan)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Play <ExternalLink size={12} />
              </a>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                Uploaded
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
