require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { router: authRouter } = require('./routes/auth');
const profileRouter = require('./routes/profile');
const entriesRouter = require('./routes/entries');
const circleRouter = require('./routes/circle');

const app = express();
const PORT = process.env.PORT || 3000;


for (const key of [
  'JWT_SECRET',
  'ENCRYPTION_KEY'
]) {
  if (!process.env[key]) {
    console.error(
      `\nMissing required environment variable: ${key}\n` +
      `Copy .env.example to .env and fill in real values before starting the server.\n`
    );
    process.exit(1);
  }
}

app.use(cors());
app.use(express.json({ limit: '200kb' }));


app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});


app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/circle', circleRouter);


app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});


app.use(express.static(path.join(__dirname, '..', 'public')));


app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }

  res.sendFile(
    path.join(__dirname, '..', 'public', 'index.html')
  );
});


app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: 'Something went wrong on our end.'
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});