import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function ActiveSessionMap({ pings = [], initialLocation, victimName }) {
  const mapContainerRef = useRef(null);

  const latestPing = pings.length > 0 ? pings[pings.length - 1] : initialLocation || { latitude: 12.9716, longitude: 77.5946 };

  return (
    <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#111827' }}>
      {/* Visual Live Map Placeholder with Dynamic coordinates / Leaflet/Google Embed fallback */}
      <iframe
        title="Live Emergency Map"
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight="0"
        marginWidth="0"
        src={`https://maps.google.com/maps?q=${latestPing.latitude},${latestPing.longitude}&hl=en&z=16&output=embed`}
        style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)', border: 0 }}
      />

      {/* Real-time Telemetry HUD Overlay */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 10px #ef4444' }}></span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>LIVE GPS TELEMETRY</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
          LAT: {latestPing.latitude?.toFixed(6)} | LNG: {latestPing.longitude?.toFixed(6)}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Total Breadcrumb Pings: <strong style={{ color: '#fff' }}>{pings.length}</strong>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '8px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Navigation size={14} color="var(--accent-emerald)" />
        Tracking: <span style={{ color: '#fff', fontWeight: 600 }}>{victimName || 'Victim'}</span>
      </div>
    </div>
  );
}
