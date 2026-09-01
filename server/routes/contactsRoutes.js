const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');

/**
 * GET /api/contacts/:uid
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Valid user ID parameter is required' });
    }

    if (!db) {
      return res.json({
        contacts: [
          { id: 'c1', name: 'Mom', phone: '+919876543210', relationship: 'Mother', priority: 1 },
          { id: 'c2', name: 'Alex (Brother)', phone: '+919876543211', relationship: 'Brother', priority: 2 }
        ]
      });
    }

    const snap = await db.ref(`emergencyContacts/${uid}`).once('value');
    const val = snap.val() || {};
    const contacts = Object.entries(val).map(([id, data]) => ({ id, ...data }));
    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/contacts/:uid
 */
router.post('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, relationship = 'Contact', priority = 1 } = req.body;

    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Valid user ID parameter is required' });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Contact name is required' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
      return res.status(400).json({ error: 'Valid phone number is required (at least 6 digits)' });
    }

    const contactId = `contact_${Date.now()}`;
    const contactData = {
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim(),
      priority: Number(priority) || 1,
      createdAt: Date.now()
    };

    if (db) {
      await db.ref(`emergencyContacts/${uid}/${contactId}`).set(contactData);
    }

    res.status(201).json({ success: true, contactId, contactData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/contacts/:uid/:contactId
 */
router.delete('/:uid/:contactId', async (req, res) => {
  try {
    const { uid, contactId } = req.params;
    if (!uid || !contactId) {
      return res.status(400).json({ error: 'Both uid and contactId are required' });
    }

    if (db) {
      await db.ref(`emergencyContacts/${uid}/${contactId}`).remove();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
