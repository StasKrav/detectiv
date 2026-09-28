// Нормализация текста для сравнения ответов
function normalize(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');
}

// Экранирование HTML (на случай, если фронт забудет)
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Текущее время в миллисекундах
function now() {
  return Date.now();
}

module.exports = { normalize, escapeHtml, now };
