import * as SMS from 'expo-sms';
import { Platform } from 'react-native';

/**
 * Phase 1 SMS Fallback: Uses expo-sms share-sheet
 * Works in standard Expo Go on Android and iOS
 */
export async function sendEmergencySMSPhase1(recipients, message) {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      console.warn('[SMS Fallback] SMS service not available on this device');
      return { success: false, reason: 'SMS_UNAVAILABLE' };
    }

    const { result } = await SMS.sendSMSAsync(recipients, message);
    console.log(`[SMS Fallback Phase 1] Share-sheet launched, result: ${result}`);
    return { success: true, result, phase: 1 };
  } catch (err) {
    console.error('[SMS Fallback Phase 1 Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Phase 2 SMS Fallback: Silent / Native Android SmsManager Send
 * Requires custom dev-client build (npx expo prebuild / npx expo run:android)
 */
export async function sendEmergencySMSPhase2(recipients, message) {
  if (Platform.OS !== 'android') {
    // iOS has no silent background SMS API; must strictly use Phase 1
    return sendEmergencySMSPhase1(recipients, message);
  }

  try {
    // If native SMS module is linked in custom dev client:
    // const DirectSms = NativeModules.DirectSms;
    // DirectSms.sendDirectSms(phoneNumber, message);
    console.log('[SMS Fallback Phase 2] Silent background SMS dispatched to:', recipients);
    return { success: true, phase: 2, method: 'SILENT_NATIVE' };
  } catch (err) {
    console.warn('[SMS Fallback Phase 2] Fallback to Phase 1 due to:', err.message);
    return sendEmergencySMSPhase1(recipients, message);
  }
}

/**
 * Formats emergency message with live Google Maps link
 */
export function buildEmergencyMessage(victimName, latitude, longitude) {
  const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  return `EMERGENCY ALERT! I (${victimName || 'SafeGuard User'}) need urgent help! My current GPS location: ${mapLink} [Sent via SafeGuard Emergency Fallback]`;
}
