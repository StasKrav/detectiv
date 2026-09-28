// ==================== API ====================
// Все запросы к бэкенду — через эту обёртку.

const BASE = '/api';

// Базовый запрос
async function request(method, path, body = null) {
  const options = {
    method,
    credentials: 'include',           // важно: отправляем cookie
    headers: {}
  };

  if (body !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Ошибка запроса');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ==================== AUTH ====================
export const api = {
  // Регистрация
  register: (email, password, name) =>
    request('POST', '/auth/register', { email, password, name }),

  // Вход
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  // Выход
  logout: () =>
    request('POST', '/auth/logout'),

  // Кто я
  me: () =>
    request('GET', '/auth/me'),

  // ==================== ЗАГАДКИ ====================
  getRiddles: () =>
    request('GET', '/riddles'),

  createRiddle: (data) =>
    request('POST', '/riddles', data),

  guessRiddle: (id, answer) =>
    request('POST', `/riddles/${id}/guess`, { answer }),

  hintRiddle: (id) =>
    request('POST', `/riddles/${id}/hint`),

  likeRiddle: (id) =>
    request('POST', `/riddles/${id}/like`),

  reportRiddle: (id) =>
    request('POST', `/riddles/${id}/report`),

  // ==================== ИСТОРИИ ====================
  getStories: () =>
    request('GET', '/stories'),

  createStory: (data) =>
    request('POST', '/stories', data),

  sendStoryVersion: (id, text) =>
    request('POST', `/stories/${id}/version`, { text }),

  hintStory: (id) =>
    request('POST', `/stories/${id}/hint`),

  reportStory: (id) =>
    request('POST', `/stories/${id}/report`),

  // ==================== ВЫПУСКИ ====================
  getCurrentIssue: () =>
    request('GET', '/issues/current'),

  getIssues: () =>
    request('GET', '/issues'),

  closeIssue: () =>
    request('POST', '/issues/close')
};
