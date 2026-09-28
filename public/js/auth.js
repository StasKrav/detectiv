import { api } from './api.js';
import { setUser } from './state.js';
import { toast, hideAuthScreen } from './ui.js';

console.log('>>> auth.js start');

const state = {
  mode: 'login',   // 'login' | 'register'
  loading: false
};

export function renderAuth() {
 console.log('renderAuth: loading =', state.loading, 'mode =', state.mode);
  const el = document.getElementById('auth-screen');
  if (!el) return;

  const isLogin = state.mode === 'login';

  el.innerHTML = `
    <div class="auth-card">
      <h2>${isLogin ? 'Вход' : 'Регистрация'}</h2>
      <p class="muted-note">${isLogin ? 'Войди, чтобы играть' : 'Создай аккаунт — получишь 10 пуаросов'}</p>

      <label>Email</label>
      <input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email">

      <label>Пароль</label>
      <input type="password" id="auth-password" placeholder="${isLogin ? 'Твой пароль' : 'Минимум 6 символов'}" autocomplete="${isLogin ? 'current-password' : 'new-password'}">

      ${!isLogin ? '<label>Имя</label><input type="text" id="auth-name" placeholder="Как тебя звать?" maxlength="30">' : ''}

      <div style="margin-top:18px">
        <button class="btn primary" id="auth-submit" ${state.loading ? 'disabled' : ''}>
          ${state.loading ? 'Подожди...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
        </button>
      </div>

      <p class="auth-switch">
        ${isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
        <a href="#" id="auth-switch-link">${isLogin ? 'Зарегистрируйся' : 'Войди'}</a>
      </p>
    </div>
  `;

  document.getElementById('auth-submit').onclick = submit;
  document.getElementById('auth-switch-link').onclick = (e) => {
    e.preventDefault();
    state.mode = isLogin ? 'register' : 'login';
    renderAuth();
  };

  // Enter в полях
  el.querySelectorAll('input').forEach(inp => {
    inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  });
}

async function submit(e) {
  console.log('submit: вызван');
  console.log('  loading =', state.loading);
  console.log('  event =', e && e.type);
  console.log('  activeElement =', document.activeElement && document.activeElement.id);
  console.log('  stack =', new Error().stack);
  if (state.loading) return;


  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  console.log('ПРОВЕРКА: email =', JSON.stringify(email), 'password length =', password.length);
  
  const nameEl = document.getElementById('auth-name');
  const name = nameEl ? nameEl.value.trim() : '';

  if (!email || !password) return toast('Заполни email и пароль');
  if (state.mode === 'register' && !name) return toast('Введи имя');

  state.loading = true;
  renderAuth();

  try {
    let result;
    if (state.mode === 'login') {
      result = await api.login(email, password);
    } else {
      result = await api.register(email, password, name);
    }

    setUser(result.user);
    toast(state.mode === 'login' ? 'Добро пожаловать' : 'Аккаунт создан');

    console.log('ПРОВЕРКА: setUser ок');

    console.log('ПРОВЕРКА: login ок, user =', result.user);

    // Скрываем экран входа и грузим вкладки
    hideAuthScreen();
    console.log('ПРОВЕРКА: вызываю hideAuthScreen');
    hideAuthScreen();
    console.log('ПРОВЕРКА: hideAuthScreen вернулся');
    
    console.log('ПРОВЕРКА: отправляю событие');
    window.dispatchEvent(new Event('sherlock:logged-in'));
    console.log('ПРОВЕРКА: событие отправлено');
    
    window.dispatchEvent(new Event('sherlock:logged-in'));
  } catch (e) {
    toast(e.message || 'Ошибка');
    console.log('submit: ставлю loading = true');
    state.loading = true;
    renderAuth();
  }
}
