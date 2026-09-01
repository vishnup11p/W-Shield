const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');

/**
 * POST /api/evidence/:sessionId/meta
 * Register recorded audio/video chunk metadata
 */
router.post('/:sessionId/meta', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type = 'AUDIO_CHUNK', downloadUrl, storagePath, chunkIndex = 1, durationMs, sizeBytes } = req.body;

    const evidenceId = `ev_${Date.now()}_${chunkIndex}`;
    const evidenceData = {
      type,
      downloadUrl: downloadUrl || '',
      storagePath: storagePath || '',
      chunkIndex,
      durationMs: durationMs || 0,
      sizeBytes: sizeBytes || 0,
      createdAt: Date.now()
    };

    if (db) {
      await db.ref(`evidence/${sessionId}/${evidenceId}`).set(evidenceData);
    }

    res.status(201).json({ success: true, evidenceId, evidenceData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/evidence/:sessionId
 * List all evidence chunks for an SOS session
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!db) return res.json({ evidence: [] });

    const snap = await db.ref(`evidence/${sessionId}`).once('value');
    const val = snap.val() || {};
    const evidence = Object.entries(val).map(([id, data]) => ({ id, ...data }));
    res.json({ evidence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
