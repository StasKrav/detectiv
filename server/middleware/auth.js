const jwt = require('jsonwebtoken');

// Секретный ключ — в продакшене брать из .env
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const COOKIE_NAME = 'sherlock_token';
const TOKEN_TTL_DAYS = 30;

// Создать JWT и положить в httpOnly cookie
function setAuthCookie(res, userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_TTL_DAYS + 'd' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,          // в продакшене с HTTPS — true
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

// Удалить cookie
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Middleware: обязательная аутентификация
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Требуется вход' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (e) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Сессия истекла' });
  }
}

// Middleware: опциональная аутентификация (для публичных ручек)
function optionalAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.userId;
    } catch (e) {
      // Игнорируем — просто аноним
    }
  }
  next();
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  optionalAuth,
  COOKIE_NAME
};
