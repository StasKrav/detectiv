import { api } from './api.js';
import { getUser, setUser } from './state.js';
import { toast, escapeHtml } from './ui.js';

export async function renderProfile() {
  const el = document.getElementById('tab-profile');
  el.innerHTML = '<div class="empty">Загрузка...</div>';

  try {
    const { user } = await api.me();
    setUser(user);
    window.dispatchEvent(new Event('sherlock:update-header'));

    const rank = user.solved >= 10 ? 'Шерлок' : user.solved >= 5 ? 'Детектив' : user.solved >= 1 ? 'Новичок' : 'Наблюдатель';

    el.innerHTML = `
      <div class="card">
        <h3>${escapeHtml(user.name)} <span class="status-badge gold">${rank}</span></h3>
        <div style="margin-top:14px">
          <div class="transaction"><span>Баланс</span><span class="amount plus">${user.balance} PUS</span></div>
          <div class="transaction"><span>Разгадано загадок</span><span>${user.solved}</span></div>
          <div class="transaction"><span>Загадано загадок</span><span>${user.authored}</span></div>
          <div class="transaction"><span>Написано историй</span><span>${user.stories_written}</span></div>
        </div>
      </div>

      <div class="card">
        <h3>Сменить имя</h3>
        <div class="input-row" style="margin-top:10px">
          <input id="p-name" value="${escapeHtml(user.name)}">
          <button class="btn primary" id="p-save">Сохранить</button>
        </div>
      </div>

      <div class="card">
        <h3>Выход</h3>
        <button class="btn danger" id="p-logout">Выйти из аккаунта</button>
      </div>
    `;

    document.getElementById('p-save').onclick = async () => {
      const name = document.getElementById('p-name').value.trim();
      if (!name) return toast('Пусто');
      try {
        const { user } = await api.updateMe(name);
        setUser(user);
        window.dispatchEvent(new Event('sherlock:update-header'));
        toast('Сохранено');
        renderProfile();
      } catch (e) {
        toast(e.message);
      }
    };

    document.getElementById('p-logout').onclick = async () => {
      try {
        await api.logout();
        setUser(null);
        location.reload();
      } catch (e) {
        toast(e.message);
      }
    };

  } catch (e) {
    el.innerHTML = '<div class="empty">Ошибка: ' + escapeHtml(e.message) + '</div>';
  }
}
