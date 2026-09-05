// server/auth.js
const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a long random string.');
  }
  return secret;
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });
  try {
    const payload = jwt.verify(token, getSecret());
    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { signToken, requireAuth };
