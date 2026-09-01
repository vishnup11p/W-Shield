# SafeGuard Live Presentation & Evaluator Demo Script

This document provides an exact, step-by-step sequence for demonstrating the **SafeGuard (Network-Adaptive Women Safety System)** during a presentation or engineering evaluation.

---

## 📋 Prerequisites & Setup Before Presentation

1. **Start Backend Server**:
   ```powershell
   cd server
   node index.js
   ```
   *Verify output displays:* `SafeGuard Backend running on port 5000`.

2. **Start Web Dashboard**:
   ```powershell
   cd web-dashboard
   npm run dev
   ```
   *Open browser to:* `http://localhost:5173`. Show the initial **SafeGuard Emergency Operations Center** empty state.

3. **Launch Mobile App**:
   ```powershell
   cd mobile
   npx expo start
   ```
   *Open on Android device / Emulator via Expo Go.*

---

## 🎬 Live Demo Sequence

### Act 1: Onboarding & Emergency Contact Management (1 minute)
1. **Screen**: Show the mobile onboarding screen with phone verification.
2. **Action**: Tap **"Verify & Open SafeGuard"** to enter the main dashboard.
3. **Action**: Scroll to **Emergency Contacts**; show existing contacts and add a new contact (e.g., `Dad`, `+919876543212`).
4. **Point to highlight**: Contacts are synchronized in real-time with Firebase Realtime Database.

---

### Act 2: Online SOS Trigger & Real-time Live Tracking (2 minutes)
1. **Action**: On the mobile app (in `ONLINE` mode), tap the large red **SOS** button.
2. **Result on Mobile**:
   - Status switches immediately to `SENDING` → `CONFIRMED`.
   - Live GPS Telemetry card displays current Latitude / Longitude.
   - Continuous 15-second background audio recording starts (`expo-av`).
3. **Switch to Web Dashboard (`http://localhost:5173`)**:
   - The incident appears immediately in the left sidebar with a pulsing red emergency indicator.
   - Active emergency card displays victim details, battery level, network mode (`ONLINE`), and trigger type (`BUTTON`).
   - The **Live GPS Telemetry HUD** displays coordinates and moving position.
   - Audio evidence chunks appear progressively in the **Recorded Evidence Chunks** panel.

---

### Act 3: Emergency Contact Acknowledgment & Escalation Timeout (1.5 minutes)
1. **Action on Dashboard**: Click the green **"Acknowledge SOS Alert"** button.
2. **Result**:
   - Status transitions to `CONFIRMED`.
   - Acknowledgment timestamp and responder identity are written back to Firebase Realtime Database.
   - The backend escalation timer is stopped.
3. **Explain Escalation Logic**:
   - *If unacknowledged for >45 seconds, the state machine automatically advances to `ESCALATED`, expanding the `geofire-common` nearby community alert radius from 1km to 2.5km and notifying broader neighborhood responders.*

---

### Act 4: Network-Adaptive Offline Fallback Demonstration (2 minutes)
1. **Action on Mobile**:
   - Either toggle the **"DEMO: OFFLINE"** button in the header or turn on Airplane Mode.
   - Notice the network badge switches to `OFFLINE`.
2. **Action**: Trigger SOS (or simulate a device shake).
3. **Result**:
   - SafeGuard detects the network blackout.
   - Automatically launches the **Phase 1 SMS Share-Sheet** via `expo-sms`, pre-filled with all emergency contact numbers, a distress message, and an exact Google Maps coordinate link.
4. **Point to highlight**: The network-adaptive engine ensures distress signals escape even when cellular data or WiFi is dead.

---

### Act 5: Resolve Incident
1. **Action on Mobile**: Tap the green **"CANCEL SOS"** button.
2. **Result**: GPS streaming and evidence recording cease; status is resolved across the web dashboard and mobile app.
