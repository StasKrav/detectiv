import { api } from './api.js';
import { getUser } from './state.js';
import { escapeHtml } from './ui.js';

export async function renderProfile() {
  const el = document.getElementById('tab-profile');
  const user = getUser();
  if (!user) {
    el.innerHTML = '<div class="empty">Войди в аккаунт</div>';
    return;
  }
  el.innerHTML = `
    <div class="card">
      <h3>${escapeHtml(user.name)}</h3>
      <div class="transaction"><span>Баланс</span><span>${user.balance} PUS</span></div>
      <div class="transaction"><span>Разгадано</span><span>${user.solved}</span></div>
    </div>
  `;
}
