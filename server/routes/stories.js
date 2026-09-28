const express = require('express');
const db = require('../db');
const { now } = require('../utils');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ==================== ЭКОНОМИКА ====================
const ECONOMY = {
  costStoryPublish: 1,    // −1 PUS за публикацию
  costHint: 1,            // −1 PUS за подсказку
  rewardStoryQuality: 3   // +3 PUS автору, если история в топе выпуска
};

// ==================== ХЕЛПЕРЫ ====================

// Собрать карточку истории
function buildStory(s, userId) {
  const versions = db.prepare(`
    SELECT sv.*, u.name as author_name
    FROM story_versions sv
    JOIN users u ON u.id = sv.user_id
    WHERE sv.story_id = ?
    ORDER BY sv.created_at ASC
  `).all(s.id);

  const myVersion = userId ? versions.find(v => v.user_id === userId) : null;
  const isClosed = !!s.closed;

  const result = {
    id: s.id,
    title: s.title,
    text: s.text,
    image: s.image_url,
    hint: s.hint,
    author: s.author_name,
    authorId: s.author_id,
    issueNumber: s.issue_number,
    createdAt: s.created_at,
    closed: isClosed,
    versionsCount: versions.length,
    versions: versions.map(v => ({
      author: v.author_name,
      text: v.text,
      isCorrect: !!v.is_correct
    })),
    myVersion: myVersion ? myVersion.text : null
  };

  // Ответ и правильные версии — только после закрытия
  if (isClosed) {
    result.answer = s.answer;
  }

  return result;
}

// ==================== СПИСОК ИСТОРИЙ ====================
router.get('/', optionalAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, u.name as author_name
    FROM stories s
    JOIN users u ON u.id = s.author_id
    ORDER BY s.created_at DESC
  `).all();

  const open = [];
  const archive = [];

  for (const s of rows) {
    const card = buildStory(s, req.userId);
    if (card.closed) archive.push(card);
    else open.push(card);
  }

  // Текущий выпуск
  const currentIssue = db.prepare('SELECT * FROM issues ORDER BY number DESC LIMIT 1').get();

  res.json({
    ok: true,
    open,
    archive,
    issueNumber: currentIssue ? currentIssue.number : 1
  });
});

// ==================== СОЗДАТЬ ИСТОРИЮ ====================
router.post('/', requireAuth, (req, res) => {
  const { title = '', text, image = '', answer, hint = '' } = req.body;

  // Валидация
  if (!text || text.length < 50) {
    return res.status(400).json({ error: 'Текст минимум 50 символов' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: 'Текст максимум 5000 символов' });
  }
  if (!answer || answer.length < 10) {
    return res.status(400).json({ error: 'Опиши ответ подробнее (минимум 10 символов)' });
  }
  if (answer.length > 2000) {
    return res.status(400).json({ error: 'Ответ максимум 2000 символов' });
  }
  if (title.length > 100) {
    return res.status(400).json({ error: 'Заголовок максимум 100 символов' });
  }

  // Проверка баланса
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId);
  if (user.balance < ECONOMY.costStoryPublish) {
    return res.status(400).json({ error: 'Недостаточно пуаросов' });
  }

  // Текущий выпуск
  const currentIssue = db.prepare('SELECT * FROM issues ORDER BY number DESC LIMIT 1').get();
  const issueNumber = currentIssue ? currentIssue.number : 1;

  // Списываем пуаросы
  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
    .run(ECONOMY.costStoryPublish, req.userId);

  db.prepare(`
    INSERT INTO transactions (user_id, amount, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.userId, -ECONOMY.costStoryPublish, 'Публикация истории', now());

  // Создаём историю
  const result = db.prepare(`
    INSERT INTO stories (author_id, title, text, image_url, answer, hint, issue_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, title.trim(), text.trim(), image.trim(), answer.trim(), hint.trim(), issueNumber, now());

  // Инкремент счётчика
  db.prepare('UPDATE users SET stories_written = stories_written + 1 WHERE id = ?').run(req.userId);

  res.json({ ok: true, id: result.lastInsertRowid, issueNumber });
});

// ==================== ОТПРАВИТЬ ВЕРСИЮ ====================
router.post('/:id/version', requireAuth, (req, res) => {
  const storyId = parseInt(req.params.id);
  const { text } = req.body;

  if (!text || text.length < 10) {
    return res.status(400).json({ error: 'Версия минимум 10 символов' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Версия максимум 2000 символов' });
  }

  const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(storyId);
  if (!s) return res.status(404).json({ error: 'История не найдена' });
  if (s.closed) return res.status(400).json({ error: 'Выпуск уже закрыт' });

  // Уже отправлял?
  const already = db.prepare('SELECT 1 FROM story_versions WHERE story_id = ? AND user_id = ?')
    .get(storyId, req.userId);
  if (already) {
    return res.status(400).json({ error: 'Ты уже отправил версию' });
  }

  db.prepare(`
    INSERT INTO story_versions (story_id, user_id, text, created_at)
    VALUES (?, ?, ?, ?)
  `).run(storyId, req.userId, text.trim(), now());

  res.json({ ok: true });
});

// ==================== ПОДСКАЗКА К ИСТОРИИ ====================
router.post('/:id/hint', requireAuth, (req, res) => {
  const storyId = parseInt(req.params.id);

  const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(storyId);
  if (!s) return res.status(404).json({ error: 'История не найдена' });
  if (!s.hint) return res.status(400).json({ error: 'У этой истории нет подсказки' });

  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId);
  if (user.balance < ECONOMY.costHint) {
    return res.status(400).json({ error: 'Недостаточно пуаросов' });
  }

  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
    .run(ECONOMY.costHint, req.userId);

  db.prepare(`
    INSERT INTO transactions (user_id, amount, reason, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.userId, -ECONOMY.costHint, 'Подсказка к истории', now());

  res.json({ ok: true, hint: s.hint, cost: ECONOMY.costHint });
});

// ==================== ЖАЛОБА (заглушка) ====================
router.post('/:id/report', requireAuth, (req, res) => {
  res.json({ ok: true, message: 'Жалоба принята' });
});

module.exports = router;
