const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { encrypt, decrypt } = require('../crypto');
const { computeStats } = require('../predict');

const router = express.Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function decryptEntries(raw) {
  const out = {};
  for (const [date, e] of Object.entries(raw)) {
    out[date] = {
      flow: e.flow || null,
      symptoms: e.symptoms || [],
      note: e.noteEnc ? decrypt(e.noteEnc) : ''
    };
  }
  return out;
}

// GET /api/entries -> all of this user's entries, decrypted
router.get('/', requireAuth, async (req, res) => {
  const raw = await db.getEntries(req.userId);
  res.json({ entries: decryptEntries(raw) });
});

// PUT /api/entries/:date -> upsert one day's log
router.put('/:date', requireAuth, async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD.' });
  const { flow, symptoms, note } = req.body || {};
  if (flow !== null && flow !== undefined && !['light', 'medium', 'heavy', 'dying', 'gore-dolu'].includes(flow)) {
    return res.status(400).json({ error: 'flow must be light, medium, heavy, dying, gore-dolu or null.' });
  }
  const entry = {
    flow: flow || null,
    symptoms: Array.isArray(symptoms) ? symptoms.slice(0, 30) : [],
    noteEnc: note ? encrypt(note) : null
  };
  await db.upsertEntry(req.userId, date, entry);
  res.json({ entry: { flow: entry.flow, symptoms: entry.symptoms, note: note || '' } });
});

// GET /api/entries/predictions -> derived cycle stats
router.get('/meta/predictions', requireAuth, async (req, res) => {
  const user = await db.getUser(req.userId);
  const raw = await db.getEntries(req.userId);
  const entries = decryptEntries(raw);
  const stats = computeStats(entries, user);
  res.json({ stats });
});

module.exports = router;
