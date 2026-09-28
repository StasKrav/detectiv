const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { now } = require('../utils');
const { setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 10;
const STARTING_BALANCE = 10;

// ==================== РЕГИСТРАЦИЯ ====================
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  // Валидация
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполни email, пароль и имя' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  }
  if (name.length < 2 || name.length > 30) {
    return res.status(400).json({ error: 'Имя от 2 до 30 символов' });
  }

  // Проверка, что email свободен
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email уже занят' });
  }

  // Хешируем пароль
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Создаём пользователя
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, balance, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(email.toLowerCase(), passwordHash, name, STARTING_BALANCE, now());

  const userId = result.lastInsertRowid;

  // Записываем стартовый бонус в транзакции
  db.prepare(`
    INSERT INTO transactions (user_id, amount, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, STARTING_BALANCE, 'Стартовый бонус', now());

  // Ставим cookie
  setAuthCookie(res, userId);

  res.json({
    ok: true,
    user: { id: userId, email: email.toLowerCase(), name, balance: STARTING_BALANCE }
  });
});

// ==================== ВХОД ====================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Введи email и пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  setAuthCookie(res, user.id);

  res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance
    }
  });
});

// ==================== ВЫХОД ====================
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// ==================== КТО Я ====================
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, balance, solved, authored, stories_written, created_at
    FROM users WHERE id = ?
  `).get(req.userId);

  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Пользователь не найден' });
  }

  res.json({ ok: true, user });
});

module.exports = router;
