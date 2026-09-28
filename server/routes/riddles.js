const express = require('express');
const db = require('../db');
const { normalize, now } = require('../utils');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ==================== ЭКОНОМИКА ====================
const ECONOMY = {
  rewardSolved: 1,        // +1 PUS за разгадку
  rewardSolvedFirst: 2,   // +2 PUS бонусом первому
  costHint: 1             // −1 PUS за подсказку
};

// ==================== ХЕЛПЕРЫ ====================

// Проверить, закрыта ли загадка
function isClosed(r) {
  if (r.closed) return true;
  if ((now() - r.created_at) / 60000 >= r.time_limit_min) return true;
  const solversCount = db.prepare('SELECT COUNT(*) as c FROM riddle_solvers WHERE riddle_id = ?').get(r.id).c;
  if (solversCount >= r.max_solvers) return true;
  return false;
}

// Собрать карточку загадки для выдачи
function buildRiddle(r, userId) {
  const solvers = db.prepare(`
    SELECT u.id, u.name FROM riddle_solvers rs
    JOIN users u ON u.id = rs.user_id
    WHERE rs.riddle_id = ?
    ORDER BY rs.solved_at ASC
  `).all(r.id);

  const solvedByMe = userId ? solvers.some(s => s.id === userId) : false;
  const closed = isClosed(r);

  const result = {
    id: r.id,
    text: r.text,
    hint: r.hint,
    author: r.author_name,
    authorId: r.author_id,
    timeLimitMin: r.time_limit_min,
    maxSolvers: r.max_solvers,
    createdAt: r.created_at,
    closed,
    likes: r.likes,
    attempts: r.attempts,
    solvers: solvers.map(s => s.name),
    solversCount: solvers.length,
    solvedByMe,
    reward: ECONOMY.rewardSolved
  };

  // Ответ показываем только если закрыта
  if (closed) result.answer = r.answer;

  return result;
}

// ==================== СПИСОК ЗАГАДОК ====================
router.get('/', optionalAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, u.name as author_name
    FROM riddles r
    JOIN users u ON u.id = r.author_id
    ORDER BY r.created_at DESC
  `).all();

  const active = [];
  const archive = [];

  for (const r of rows) {
    const card = buildRiddle(r, req.userId);
    if (card.closed) archive.push(card);
    else active.push(card);
  }

  // Активные — сортируем по «горячести» (разгадавшие + лайки)
  active.sort((a, b) => (b.solversCount + b.likes) - (a.solversCount + a.likes));

  res.json({ ok: true, active, archive });
});

// ==================== СОЗДАТЬ ЗАГАДКУ ====================
router.post('/', requireAuth, (req, res) => {
  const { text, answer, hint = '', timeLimitMin = 60, maxSolvers = 5 } = req.body;

  // Валидация
  if (!text || text.length < 15) {
    return res.status(400).json({ error: 'Текст минимум 15 символов' });
  }
  if (!answer || answer.length < 2) {
    return res.status(400).json({ error: 'Ответ минимум 2 символа' });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: 'Текст максимум 500 символов' });
  }
  if (answer.length > 100) {
    return res.status(400).json({ error: 'Ответ максимум 100 символов' });
  }
  if (timeLimitMin < 1 || timeLimitMin > 1440) {
    return res.status(400).json({ error: 'Время от 1 до 1440 минут' });
  }
  if (maxSolvers < 1 || maxSolvers > 100) {
    return res.status(400).json({ error: 'Макс. разгадавших от 1 до 100' });
  }

  // Ответ не должен быть в тексте
  if (normalize(text).includes(normalize(answer))) {
    return res.status(400).json({ error: 'Ответ не должен содержаться в тексте' });
  }

  const result = db.prepare(`
    INSERT INTO riddles (author_id, text, answer, hint, time_limit_min, max_solvers, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, text.trim(), answer.trim(), hint.trim(), timeLimitMin, maxSolvers, now());

  // Инкремент счётчика «загадано» у автора
  db.prepare('UPDATE users SET authored = authored + 1 WHERE id = ?').run(req.userId);

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ==================== ОТВЕТИТЬ НА ЗАГАДКУ ====================
router.post('/:id/guess', requireAuth, (req, res) => {
  const riddleId = parseInt(req.params.id);
  const { answer } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({ error: 'Введи ответ' });
  }

  const r = db.prepare('SELECT * FROM riddles WHERE id = ?').get(riddleId);
  if (!r) return res.status(404).json({ error: 'Загадка не найдена' });

  if (isClosed(r)) {
    return res.status(400).json({ error: 'Загадка уже закрыта' });
  }

  // Уже разгадал?
  const already = db.prepare('SELECT 1 FROM riddle_solvers WHERE riddle_id = ? AND user_id = ?')
    .get(riddleId, req.userId);
  if (already) {
    return res.status(400).json({ error: 'Ты уже разгадал эту загадку' });
  }

  // Инкремент попыток
  db.prepare('UPDATE riddles SET attempts = attempts + 1 WHERE id = ?').run(riddleId);

  // Проверка ответа
  const correct = normalize(answer) === normalize(r.answer);

  if (!correct) {
    return res.json({ ok: true, correct: false });
  }

  // Считаем, первый ли это разгадавший
  const solversCount = db.prepare('SELECT COUNT(*) as c FROM riddle_solvers WHERE riddle_id = ?')
    .get(riddleId).c;
  const isFirst = solversCount === 0;

  // Записываем разгадавшего
  db.prepare(`
    INSERT INTO riddle_solvers (riddle_id, user_id, solved_at)
    VALUES (?, ?, ?)
  `).run(riddleId, req.userId, now());

  // Начисляем пуаросы
  const reward = isFirst
    ? ECONOMY.rewardSolved + ECONOMY.rewardSolvedFirst
    : ECONOMY.rewardSolved;

  db.prepare('UPDATE users SET balance = balance + ?, solved = solved + 1 WHERE id = ?')
    .run(reward, req.userId);

  db.prepare(`
    INSERT INTO transactions (user_id, amount, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.userId, reward, isFirst ? 'Первым разгадал загадку' : 'Разгадал загадку', now());

  // Автозакрытие, если достигнут лимит
  if (solversCount + 1 >= r.max_solvers) {
    db.prepare('UPDATE riddles SET closed = 1 WHERE id = ?').run(riddleId);
  }

  res.json({ ok: true, correct: true, reward, isFirst });
});

// ==================== ПОДСКАЗКА ====================
router.post('/:id/hint', requireAuth, (req, res) => {
  const riddleId = parseInt(req.params.id);

  const r = db.prepare('SELECT * FROM riddles WHERE id = ?').get(riddleId);
  if (!r) return res.status(404).json({ error: 'Загадка не найдена' });
  if (!r.hint) return res.status(400).json({ error: 'У этой загадки нет подсказки' });

  // Проверка баланса
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId);
  if (user.balance < ECONOMY.costHint) {
    return res.status(400).json({ error: 'Недостаточно пуаросов' });
  }

  // Списываем
  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
    .run(ECONOMY.costHint, req.userId);

  db.prepare(`
    INSERT INTO transactions (user_id, amount, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.userId, -ECONOMY.costHint, 'Подсказка к загадке', now());

  res.json({ ok: true, hint: r.hint, cost: ECONOMY.costHint });
});

// ==================== ЛАЙК ====================
router.post('/:id/like', requireAuth, (req, res) => {
  const riddleId = parseInt(req.params.id);

  const r = db.prepare('SELECT id FROM riddles WHERE id = ?').get(riddleId);
  if (!r) return res.status(404).json({ error: 'Загадка не найдена' });

  const already = db.prepare('SELECT 1 FROM likes WHERE riddle_id = ? AND user_id = ?')
    .get(riddleId, req.userId);

  if (already) {
    // Убираем лайк
    db.prepare('DELETE FROM likes WHERE riddle_id = ? AND user_id = ?').run(riddleId, req.userId);
    db.prepare('UPDATE riddles SET likes = likes - 1 WHERE id = ?').run(riddleId);
    return res.json({ ok: true, liked: false });
  }

  // Ставим лайк
  db.prepare('INSERT INTO likes (riddle_id, user_id, created_at) VALUES (?, ?, ?)')
    .run(riddleId, req.userId, now());
  db.prepare('UPDATE riddles SET likes = likes + 1 WHERE id = ?').run(riddleId);

  res.json({ ok: true, liked: true });
});

// ==================== ЖАЛОБА (заглушка) ====================
router.post('/:id/report', requireAuth, (req, res) => {
  // Пока просто заглушка. Позже — таблица reports + модерация.
  res.json({ ok: true, message: 'Жалоба принята' });
});

module.exports = router;
