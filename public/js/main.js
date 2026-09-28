import { api } from './api.js';
import { setUser, getUser, setTheme, getTheme, getCurrentTab, setCurrentTab } from './state.js';
import { toast, setTabVisible, showAuthScreen, hideAuthScreen } from './ui.js';
import { renderAuth } from './auth.js';
import { renderRiddles } from './riddles.js';
import { renderStories, bindStoriesEvents } from './stories.js';
import { renderShop } from './shop.js';
import { renderProfile } from './profile.js';

console.log('>>> main.js start');

// ==================== ТЕМА ====================
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.dataset.theme = 'light';
    document.getElementById('theme-toggle').textContent = '☾';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('theme-toggle').textContent = '☀';
  }
  localStorage.setItem('sherlock_theme', theme);
  setTheme(theme);
}

function initTheme() {
  const saved = localStorage.getItem('sherlock_theme') || 'dark';
  applyTheme(saved);
  document.getElementById('theme-toggle').onclick = () => {
    const current = getTheme();
    applyTheme(current === 'light' ? 'dark' : 'light');
  };
}

// ==================== ШАПКА ====================
function updateHeader() {
  const user = getUser();
  document.getElementById('user-chip').textContent = user ? user.name : 'Войти';
  document.getElementById('balance-value').textContent = user ? user.balance : 0;
  api.getRiddles().then(data => {
    document.getElementById('badge-riddles').textContent = data.active.length;
  }).catch(() => {});
  api.getStories().then(data => {
    document.getElementById('badge-stories').textContent = data.open.length;
  }).catch(() => {});
}

// ==================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ====================
async function switchTab(name) {
  setCurrentTab(name);
  setTabVisible(name);

  if (name === 'riddles') {
    await renderRiddles();
  } else if (name === 'stories') {
    await renderStories();
  } else if (name === 'shop') {
    await renderShop();
  } else if (name === 'profile') {
    await renderProfile();
  }
}

// ==================== ПРОВЕРКА СЕССИИ ====================
async function checkSession() {
  try {
    const { user } = await api.me();
    setUser(user);
    return true;
  } catch (e) {
    setUser(null);
    return false;
  }
}

// ==================== СТАРТ ====================
async function start() {
  console.log('start: initTheme');
  initTheme();

  console.log('start: checkSession');
  const loggedIn = await checkSession();
  console.log('start: loggedIn =', loggedIn);

  document.getElementById('user-chip').onclick = () => {
    if (getUser()) switchTab('profile');
    else showAuthModal();
  };

  if (!loggedIn) {
    console.log('start: showAuthModal');
    showAuthModal();
    console.log('start: showAuthModal done');
    return;
  }

  console.log('start: subscribe tabs');


  // Подписываемся на вкладки
  document.querySelectorAll('.nav-item[data-tab]').forEach(b => {
    b.onclick = () => switchTab(b.dataset.tab);
  });

  // Мобильное меню
  document.getElementById('mobile-menu').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
  };

  updateHeader();
  await switchTab('riddles');

  // Обновляем шапку после каждого действия
  window.addEventListener('sherlock:update-header', updateHeader);
}

// ==================== ЭКРАН ВХОДА ====================
// Вызывается из auth.js
function showAuthModal() {
  showAuthScreen();
  renderAuth();
}


// ==================== ЗАПУСК ====================
console.log('>>> main.js end');
start();


window.addEventListener('sherlock:logged-in', async () => {
  hideAuthScreen();
  document.querySelectorAll('.nav-item[data-tab]').forEach(b => {
    b.onclick = () => switchTab(b.dataset.tab);
  });
  document.getElementById('user-chip').onclick = () => switchTab('profile');
  document.getElementById('mobile-menu').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
  };
  updateHeader();
  await switchTab('riddles');
});
