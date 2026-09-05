// server/crypto.js
//
// Field-level encryption for sensitive free-text (notes). Passwords are
// never handled here — those are one-way hashed with bcrypt in auth.js,
// which is the correct approach for credentials. This module is for data
// that the app needs to read back later, such as journal notes, so it uses
// AES-256-GCM (authenticated encryption) with a server-held key.
//
// The key comes from the ENCRYPTION_KEY environment variable and must be a
// 32-byte value, base64 or hex encoded. See .env.example.

const crypto = require('crypto');

function loadKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Copy .env.example to .env and set a 32-byte key ' +
      '(run `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"` to generate one).'
    );
  }
  let key;
  try {
    key = Buffer.from(raw, raw.length === 64 ? 'hex' : 'base64');
  } catch (e) {
    throw new Error('ENCRYPTION_KEY could not be decoded as base64/hex.');
  }
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }
  return key;
}

function encrypt(plainText) {
  if (plainText === null || plainText === undefined || plainText === '') return null;
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // store iv + authTag + ciphertext together, base64 encoded
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(payload) {
  if (!payload) return '';
  const key = loadKey();
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
