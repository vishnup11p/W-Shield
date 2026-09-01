const { db, auth } = require('../services/firebaseAdmin');

/**
 * Middleware to verify Firebase ID Tokens (Bearer Token)
 * In development / demo mode, allows fallback if token is 'demo_token' or disabled.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If running in local demo mode without active Firebase project credentials:
    if (process.env.NODE_ENV === 'development' || !auth) {
      req.user = { uid: req.body?.victimUid || req.query?.uid || 'demo_authenticated_user' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed Bearer token' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    if (auth) {
      const decodedToken = await auth.verifyIdToken(idToken);
      req.user = decodedToken;
      return next();
    } else {
      req.user = { uid: 'dev_user_uid' };
      return next();
    }
  } catch (error) {
    console.error('[Auth Middleware Error]', error.message);
    return res.status(403).json({ error: 'Forbidden: Invalid or expired Firebase ID token' });
  }
}

module.exports = {
  requireAuth
};
