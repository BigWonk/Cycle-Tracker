const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { computeStats } = require('../predict');

const router = express.Router();

// POST /api/circle/follow  { code }
// Lets the current user follow someone else's shared overview by code.
router.post('/follow', requireAuth, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required.' });
  const ownerId = await db.ownerOfCircleCode(code);
  if (!ownerId) return res.status(404).json({ error: 'No account found for that code.' });
  if (ownerId === req.userId) return res.status(400).json({ error: "You can't follow your own code." });
  await db.followCircle(req.userId, code);
  res.json({ ok: true });
});

// GET /api/circle -> everyone the current user follows, with their
// current phase / predicted next period only (never notes or symptoms).
router.get('/', requireAuth, async (req, res) => {
  const codes = await db.getFollowedCodes(req.userId);
  const results = await Promise.all(codes.map(async (code) => {
    const ownerId = await db.ownerOfCircleCode(code);
    const owner = ownerId ? await db.getUser(ownerId) : null;
    if (!owner) return { code, name: 'Unknown', phase: null };
    const raw = await db.getEntries(ownerId);
    const entries = {};
    for (const [date, e] of Object.entries(raw)) entries[date] = { flow: e.flow, symptoms: e.symptoms };
    const stats = computeStats(entries, owner);
    return {
      code,
      name: owner.name,
      phase: stats.phase,
      dayInCycle: stats.dayInCycle,
      predictedNext: stats.predictedNext
    };
  }));
  res.json({ following: results });
});

module.exports = router;
