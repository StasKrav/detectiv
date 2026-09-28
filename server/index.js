const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const riddlesRoutes = require('./routes/riddles');
const storiesRoutes = require('./routes/stories');
const issuesRoutes = require('./routes/issues');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/riddles', riddlesRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/issues', issuesRoutes);

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
