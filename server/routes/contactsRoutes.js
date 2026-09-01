const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');

/**
 * GET /api/contacts/:uid
 * Retrieve emergency contacts for a user
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!db) {
      return res.json({
        contacts: [
          { id: 'c1', name: 'Mom', phone: '+919876543210', relationship: 'Mother', priority: 1 },
          { id: 'c2', name: 'Brother (Alex)', phone: '+919876543211', relationship: 'Brother', priority: 2 }
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
 * Add or update an emergency contact
 */
router.post('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, phone, relationship = 'Contact', priority = 1 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const contactId = `contact_${Date.now()}`;
    const contactData = {
      name,
      phone,
      relationship,
      priority,
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
 * Remove an emergency contact
 */
router.delete('/:uid/:contactId', async (req, res) => {
  try {
    const { uid, contactId } = req.params;
    if (db) {
      await db.ref(`emergencyContacts/${uid}/${contactId}`).remove();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
