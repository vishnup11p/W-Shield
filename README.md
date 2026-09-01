# SafeGuard — Network-Adaptive Women Safety System

SafeGuard is a full-stack, Android-first emergency response and women's safety ecosystem designed to adapt dynamically to real-time network conditions. It ensures life-saving SOS alerts, real-time GPS telemetry, and audio evidence reach emergency contacts even during cellular/data blackouts.

---

## 🚀 Key Features

1. **Network-Adaptive Alerting Engine**:
   - **Online Mode**: High-frequency GPS streaming over Socket.IO & Firebase Realtime Database + instant Push Notifications (FCM).
   - **Offline / Poor Network Mode**: Triggers automatic device SMS fallback containing exact Google Maps coordinates and emergency distress message.
2. **Multi-Modal SOS Activation**:
   - In-App Quick SOS button (with confirmation countdown & instant override).
   - Shake-to-Trigger SOS (accelerometer via `expo-sensors` with debounce).
   - Voice-Triggered SOS (wake-phrase detection).
3. **Nearby User Geospatial Queries (`geofire-common`)**:
   - Computes geohashes dynamically for users.
   - Dispatches privacy-preserving alerts (approximate neighborhood radius) to nearby registered users.
4. **Live Location Streaming & Tracking**:
   - Continuous real-time GPS coordinates synced to Firebase Realtime Database and streamed to the monitoring dashboard.
5. **Continuous Evidence Capture**:
   - Background audio chunks recorded via `expo-av` and uploaded progressively to Firebase Storage, ensuring evidence survives device loss or damage.
6. **Family & Monitoring Web Dashboard**:
   - Real-time React dashboard with Google Maps integration, live breadcrumb polyline, and instant SOS session acknowledgment.

---

## 📲 SMS Fallback Strategy

SafeGuard implements a two-phase SMS fallback mechanism:

### Phase 1 — Share-Sheet Flow (Default / Expo Go Compatible)
- Uses `expo-sms` to launch the native SMS composer pre-filled with the distress message and Google Maps location link.
- **Demo Ready**: Works out-of-the-box in Expo Go and all standard mobile environments with a single tap confirmation.

### Phase 2 — Silent / Background Send (Stretch Goal / Custom Dev Client)
- Requires a custom Android dev client (`npx expo prebuild` and `npx expo run:android`).
- Directly calls Android's native `SmsManager.sendTextMessage()` for background silent dispatch without user interaction.
- *Note: Android only. iOS adheres strictly to Phase 1.*

---

## 📁 Repository Structure

```
safety/
├── mobile/               # React Native (Expo) Android-First Mobile Application
├── server/               # Node.js + Express + Socket.IO + Firebase Admin Backend
├── web-dashboard/        # React + Google Maps Realtime Family Web Dashboard
├── .gitignore
└── README.md
```

---

## 🌿 Git Branching Strategy

- `main`: Production-ready, verified demo milestone releases.
- `dev`: Active integration branch for full-stack subsystems.
- `feature/*`: Specific feature branches (e.g., `feature/network-adaptive-engine`, `feature/shake-detection`, `feature/evidence-recording`, `feature/geofire-nearby`).

---

## 🛠️ Quickstart Setup Guide

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```
Create `.env` in `server/`:
```env
PORT=5000
FIREBASE_DATABASE_URL=https://<your-project-id>-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=<your-project-id>.appspot.com
```

### 2. Mobile App (Expo)
```bash
cd mobile
npm install
npx expo start
```

### 3. Family Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

---

## 🔒 Security & Privacy
- Location queries to nearby third-party users are fuzzed to preserve victim privacy.
- Evidence and live location pings are scoped strictly to authenticated `$sessionId` nodes in Firebase Realtime Database.
