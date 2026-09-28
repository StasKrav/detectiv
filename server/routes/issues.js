const express = require('express');
const db = require('../db');
const { now } = require('../utils');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ==================== ЭКОНОМИКА ====================
const ECONOMY = {
  rewardStoryQuality: 3   // +3 PUS автору, если история в топе
};

// ==================== ЗАКРЫТЬ ТЕКУЩИЙ ВЫПУСК ====================
router.post('/close', requireAuth, (req, res) => {
  // Пока любой авторизованный может закрыть. Позже — только редактор.
  const openStories = db.prepare('SELECT * FROM stories WHERE closed = 0').all();

  if (openStories.length === 0) {
    return res.status(400).json({ error: 'Нет открытых историй' });
  }

  const currentIssue = db.prepare('SELECT * FROM issues ORDER BY number DESC LIMIT 1').get();
  if (!currentIssue) {
    return res.status(500).json({ error: 'Нет текущего выпуска' });
  }

  // Транзакция — либо всё, либо ничего
  const closeAll = db.transaction(() => {
    for (const s of openStories) {
      // Проставляем is_correct у версий: наивная проверка по ключевым словам
      const keyWords = s.answer.toLowerCase().split(/\s+/).filter(w => w.length > 5);
      const versions = db.prepare('SELECT * FROM story_versions WHERE story_id = ?').all(s.id);

      for (const v of versions) {
        const low = v.text.toLowerCase();
        const isCorrect = keyWords.length > 0 && keyWords.some(w => low.includes(w));
        if (isCorrect) {
          db.prepare('UPDATE story_versions SET is_correct = 1 WHERE id = ?').run(v.id);
        }
      }

      // Закрываем историю
      db.prepare('UPDATE stories SET closed = 1 WHERE id = ?').run(s.id);
    }

    // Закрываем текущий выпуск
    db.prepare('UPDATE issues SET closed_at = ? WHERE id = ?').run(now(), currentIssue.id);

    // Создаём новый выпуск
    const nextNumber = currentIssue.number + 1;
    db.prepare('INSERT INTO issues (number, created_at) VALUES (?, ?)').run(nextNumber, now());

    return nextNumber;
  });

  const nextNumber = closeAll();

  res.json({
    ok: true,
    closedStories: openStories.length,
    nextIssueNumber: nextNumber
  });
});

// ==================== СПИСОК ВЫПУСКОВ ====================
router.get('/', (req, res) => {
  const issues = db.prepare('SELECT * FROM issues ORDER BY number DESC').all();
  res.json({ ok: true, issues });
});

// ==================== ТЕКУЩИЙ ВЫПУСК ====================
router.get('/current', (req, res) => {
  const current = db.prepare('SELECT * FROM issues ORDER BY number DESC LIMIT 1').get();
  const openCount = db.prepare('SELECT COUNT(*) as c FROM stories WHERE closed = 0').get().c;

  res.json({
    ok: true,
    issue: current,
    openStories: openCount
  });
});

module.exports = router;
