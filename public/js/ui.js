// ==================== UI UTILS ====================

// Экранирование HTML
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Нормализация ответа (для сравнения на фронте, если надо)
export function normalize(s) {
  return String(s).toLowerCase().trim().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
}

// Показать тост
let toastTimer = null;
export function toast(msg, isReward = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('reward', !!isReward);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// Форматирование времени «осталось X мин»
export function timeLeft(createdAt, timeLimitMin) {
  const left = Math.max(0, timeLimitMin - (Date.now() - createdAt) / 60000);
  if (left === 0) return 'вышло';
  if (left < 1) return '< 1 мин';
  return Math.ceil(left) + ' мин';
}

// Переключить видимость вкладки
export function setTabVisible(name) {
  ['riddles', 'stories', 'shop', 'profile'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('hidden', t !== name);
  });
  document.querySelectorAll('.nav-item[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
}

// Показать/скрыть элемент
export function show(el) { if (el) el.classList.remove('hidden'); }
export function hide(el) { if (el) el.classList.add('hidden'); }


export function showAuthScreen() {
  const el = document.getElementById('auth-screen');
  if (el) el.classList.remove('hidden');
}

export function hideAuthScreen() {
  const el = document.getElementById('auth-screen');
  if (el) el.classList.add('hidden');
}
