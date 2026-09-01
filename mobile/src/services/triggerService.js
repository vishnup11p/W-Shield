import { Accelerometer } from 'expo-sensors';

let subscription = null;
const SHAKE_THRESHOLD = 2.2;
const DEBOUNCE_MS = 3000;
let lastShakeTime = 0;

/**
 * Starts accelerometer listener for rapid shake triggers
 */
export function startShakeDetection(onShakeTrigger) {
  Accelerometer.setUpdateInterval(150);

  subscription = Accelerometer.addListener(accelerometerData => {
    const { x, y, z } = accelerometerData;
    const acceleration = Math.sqrt(x * x + y * y + z * z);

    if (acceleration > SHAKE_THRESHOLD) {
      const now = Date.now();
      if (now - lastShakeTime > DEBOUNCE_MS) {
        lastShakeTime = now;
        console.log('[Trigger] Shake detected! Acceleration magnitude:', acceleration);
        onShakeTrigger('SHAKE');
      }
    }
  });
}

export function stopShakeDetection() {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
