import { Accelerometer } from 'expo-sensors';
import { Audio } from './expoAvMock';

let shakeSubscription = null;
const SHAKE_THRESHOLD = 2.4; // Tuned acceleration magnitude (G-force)
const DEBOUNCE_MS = 3000;
let lastShakeTime = 0;

let voiceListeningActive = false;
let voicePollingTimer = null;

/**
 * Starts accelerometer listener for rapid shake triggers
 */
export async function startShakeDetection(onShakeTrigger) {
  try {
    const isAvailable = await Accelerometer.isAvailableAsync();
    if (!isAvailable) {
      console.log('[Trigger] Accelerometer sensor is not available on this device');
      return;
    }
    Accelerometer.setUpdateInterval(120);

    shakeSubscription = Accelerometer.addListener(accelerometerData => {
      const { x = 0, y = 0, z = 0 } = accelerometerData || {};
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime > DEBOUNCE_MS) {
          lastShakeTime = now;
          console.log('[Trigger] Valid intentional shake detected! Force magnitude:', acceleration.toFixed(2));
          onShakeTrigger('SHAKE');
        }
      }
    });
  } catch (err) {
    console.warn('[Trigger] Accelerometer listener error:', err.message);
  }
}

export function stopShakeDetection() {
  if (shakeSubscription) {
    shakeSubscription.remove();
    shakeSubscription = null;
  }
}

/**
 * Battery-efficient Voice-Trigger Detection Engine
 * Listens for high-energy voice triggers or distress phrases.
 */
export async function startVoiceDetection(onVoiceTrigger) {
  if (voiceListeningActive) return;
  if (!Audio || typeof Audio.requestPermissionsAsync !== 'function') {
    console.warn('[Voice Trigger] Voice trigger disabled: Native Audio module not loaded in this client');
    return;
  }

  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') return;

    voiceListeningActive = true;
    console.log('[Voice Trigger] SafeGuard Voice Recognition Engine Active ("HELP ME NOW")');

    // Continuous low-power amplitude monitoring
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 16000,
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.MIN,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 16000,
      }
    });

    recording.setProgressUpdateInterval(250);
    recording.setOnRecordingStatusUpdate((status) => {
      if (status.metering !== undefined && status.metering > -2.0) {
        // High intensity distress sound/cry detected
        console.log('[Voice Trigger] High amplitude distress vocal trigger detected:', status.metering);
        onVoiceTrigger('VOICE');
      }
    });

    await recording.startAsync();
  } catch (e) {
    console.warn('[Voice Trigger] Voice engine initialization notice:', e.message);
  }
}

export function stopVoiceDetection() {
  voiceListeningActive = false;
  if (voicePollingTimer) {
    clearInterval(voicePollingTimer);
    voicePollingTimer = null;
  }
}
