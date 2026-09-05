const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.patch('/', requireAuth, async (req, res) => {
  const allowed = ['name', 'avgCycleLength', 'avgPeriodLength', 'lastPeriodStart'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  const updated = await db.updateUser(req.userId, patch);
  if (!updated) return res.status(404).json({ error: 'User not found.' });
  const { passwordHash, ...safe } = updated;
  res.json({ user: safe });
});

// Companions are people the user wants to keep a personal note of (e.g. a
// partner or child) who don't necessarily have their own bloom account.
// For account-to-account sharing, see routes/circle.js.
router.get('/companions', requireAuth, async (req, res) => {
  const user = await db.getUser(req.userId);
  res.json({ companions: user.companions || [] });
});

router.post('/companions', requireAuth, async (req, res) => {
  const { name, relation } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required.' });
  const user = await db.getUser(req.userId);
  const companions = [...(user.companions || []), { name, relation: relation || 'Companion' }];
  await db.updateUser(req.userId, { companions });
  res.json({ companions });
});

router.delete('/companions/:index', requireAuth, async (req, res) => {
  const idx = Number(req.params.index);
  const user = await db.getUser(req.userId);
  const companions = [...(user.companions || [])];
  if (idx < 0 || idx >= companions.length) return res.status(404).json({ error: 'Not found.' });
  companions.splice(idx, 1);
  await db.updateUser(req.userId, { companions });
  res.json({ companions });
});

module.exports = router;
