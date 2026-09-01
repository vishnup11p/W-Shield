const { messaging } = require('./firebaseAdmin');

/**
 * Dispatches emergency push notification via Firebase Cloud Messaging
 */
async function sendEmergencyPushNotification(tokens, alertPayload) {
  if (!tokens || tokens.length === 0) {
    console.log('[NotificationService] No FCM tokens provided.');
    return { successCount: 0, failureCount: 0 };
  }

  const validTokens = Array.isArray(tokens) ? tokens.filter(Boolean) : [tokens];

  if (!messaging) {
    console.log('[NotificationService] Demo mode: Simulating FCM broadcast to', validTokens.length, 'devices:', alertPayload.title);
    return { successCount: validTokens.length, failureCount: 0 };
  }

  const message = {
    notification: {
      title: alertPayload.title || '🚨 EMERGENCY SOS ALERT',
      body: alertPayload.body || 'A contact or nearby person requires urgent assistance.'
    },
    data: {
      sessionId: alertPayload.sessionId || '',
      type: alertPayload.type || 'SOS_TRIGGER',
      latitude: String(alertPayload.latitude || ''),
      longitude: String(alertPayload.longitude || ''),
      timestamp: String(Date.now())
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'emergency_channel',
        sound: 'default',
        priority: 'max',
        vibrateTimingsMillis: [0, 500, 200, 500]
      }
    },
    tokens: validTokens
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`[NotificationService] FCM broadcast sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('[NotificationService] Failed to send multicast FCM:', error.message);
    return { successCount: 0, failureCount: validTokens.length, error: error.message };
  }
}

module.exports = {
  sendEmergencyPushNotification
};
