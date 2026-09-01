import * as SMS from 'expo-sms';
import { Platform, NativeModules, PermissionsAndroid } from 'react-native';

/**
 * Phase 1 SMS Fallback: Uses expo-sms share-sheet
 * Works in standard Expo Go on Android and iOS (Zero custom build required)
 */
export async function sendEmergencySMSPhase1(recipients, message) {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      console.warn('[SMS Fallback] SMS service not available on this device');
      return { success: false, reason: 'SMS_UNAVAILABLE' };
    }

    const cleanRecipients = recipients.filter(Boolean);
    const { result } = await SMS.sendSMSAsync(cleanRecipients, message);
    console.log(`[SMS Fallback Phase 1] Share-sheet launched, result: ${result}`);
    return { success: true, result, phase: 1 };
  } catch (err) {
    console.error('[SMS Fallback Phase 1 Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Phase 2 SMS Fallback: Silent / Native Android SmsManager Send
 * Automatically requests SEND_SMS runtime permission and dispatches silently in the background.
 * Falls back to Phase 1 gracefully on iOS or when running in pure Expo Go.
 */
export async function sendEmergencySMSPhase2(recipients, message) {
  if (Platform.OS !== 'android') {
    // iOS has no silent background SMS API by design
    return sendEmergencySMSPhase1(recipients, message);
  }

  try {
    // 1. Check & Request SEND_SMS Runtime Permission
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SafeGuard Emergency SMS Permission',
        message: 'SafeGuard requires direct SMS access to silently dispatch emergency distress coordinates during an active SOS when offline.',
        buttonPositive: 'Allow SOS SMS'
      }
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn('[SMS Phase 2] SEND_SMS permission denied by user. Falling back to Phase 1.');
      return sendEmergencySMSPhase1(recipients, message);
    }

    // 2. Check for native DirectSms module (when built with expo-dev-client / prebuild)
    const DirectSms = NativeModules.DirectSms || NativeModules.RNSmsAndroid;
    if (DirectSms && typeof DirectSms.sendDirectSms === 'function') {
      for (const phone of recipients) {
        if (phone) {
          await DirectSms.sendDirectSms(phone, message);
          console.log(`[SMS Phase 2] Direct background SMS sent to ${phone}`);
        }
      }
      return { success: true, phase: 2, method: 'SILENT_NATIVE' };
    }

    // If native module is not linked in Expo Go, use Phase 1 share-sheet
    console.log('[SMS Phase 2] Native SmsManager module not found (running in Expo Go). Launching Phase 1 share-sheet.');
    return sendEmergencySMSPhase1(recipients, message);
  } catch (err) {
    console.warn('[SMS Phase 2] Error during silent send, falling back to Phase 1:', err.message);
    return sendEmergencySMSPhase1(recipients, message);
  }
}

/**
 * Formats emergency message with live Google Maps link
 */
export function buildEmergencyMessage(victimName, latitude, longitude) {
  const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  return `🚨 EMERGENCY ALERT! I (${victimName || 'SafeGuard User'}) need urgent help! My current GPS location: ${mapLink} [SafeGuard Distress Alert]`;
}
