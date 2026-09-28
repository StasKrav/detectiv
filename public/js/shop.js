import { ECONOMY } from './state.js';

export async function renderShop() {
  const el = document.getElementById('tab-shop');
  el.innerHTML = `
    <div class="card">
      <h3>Лавка</h3>
      <p class="muted-note" style="margin-bottom:14px">Трать пуаросы на подсказки и публикации. Позже — обмен на реальные деньги.</p>
      <div class="shop-item">
        <div class="info"><div class="name">Подсказка</div><div class="desc">Намёк к загадке или истории</div></div>
        <div class="price">${ECONOMY.costHint} PUS</div>
      </div>
      <div class="shop-item">
        <div class="info"><div class="name">Публикация истории</div><div class="desc">Разместить историю в выпуске</div></div>
        <div class="price">${ECONOMY.costStoryPublish} PUS</div>
      </div>
      <div class="shop-item">
        <div class="info"><div class="name">Премиум-значок</div><div class="desc">Скоро</div></div>
        <div class="price">20 PUS</div>
      </div>
    </div>
    <div class="card">
      <h3>Как заработать</h3>
      <div class="transaction"><span>Разгадал загадку</span><span class="amount plus">+${ECONOMY.rewardSolved}</span></div>
      <div class="transaction"><span>Первый разгадавший (бонус)</span><span class="amount plus">+${ECONOMY.rewardSolvedFirst}</span></div>
      <div class="transaction"><span>Хорошая история</span><span class="amount plus">+${ECONOMY.rewardStoryQuality}</span></div>
    </div>
  `;
}
