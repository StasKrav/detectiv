import { ECONOMY } from './state.js';

export async function renderShop() {
  const el = document.getElementById('tab-shop');
  el.innerHTML = '<div class="empty">Лавка (скоро)</div>';
}
