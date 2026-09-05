const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();

function randomCircleCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';

  for (let i = 0; i < 6; i++) {
    out += chars[crypto.randomInt(chars.length)];
  }

  return out;
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avgCycleLength: u.avgCycleLength,
    avgPeriodLength: u.avgPeriodLength,
    lastPeriodStart: u.lastPeriodStart,
    circleCode: u.circleCode
  };
}

router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password,
    avgCycleLength,
    avgPeriodLength,
    lastPeriodStart
  } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'name, email, and password are required.'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters.'
    });
  }

  const existingUser = await db.findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({
      error: 'An account with that email already exists.'
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    avgCycleLength: Number(avgCycleLength) || 28,
    avgPeriodLength: Number(avgPeriodLength) || 5,
    lastPeriodStart: lastPeriodStart || null,
    circleCode: randomCircleCode(),
    createdAt: new Date().toISOString()
  };

  await db.createUser(user);

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: publicUser(user)
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'email and password are required.'
    });
  }

  const user = await db.findUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid email or password.'
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({
      error: 'Invalid email or password.'
    });
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: publicUser(user)
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.getUser(req.userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found.'
    });
  }

  res.json({
    user: publicUser(user)
  });
});

module.exports = {
  router,
  publicUser
};
