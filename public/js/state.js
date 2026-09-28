// ==================== STATE ====================
// Глобальное состояние приложения.

const state = {
  user: null,        // текущий пользователь или null
  theme: 'dark',     // 'dark' | 'light'
  currentTab: 'riddles'
};

// ==================== USER ====================
export function setUser(user) {
  state.user = user;
}

export function getUser() {
  return state.user;
}

export function isLoggedIn() {
  return state.user !== null;
}

// ==================== TAB ====================
export function setCurrentTab(tab) {
  state.currentTab = tab;
}

export function getCurrentTab() {
  return state.currentTab;
}

// ==================== THEME ====================
export function getTheme() {
  return state.theme;
}

export function setTheme(theme) {
  state.theme = theme;
}

// ==================== ЭКОНОМИКА (константы) ====================
// Дублируем с бэка, чтобы фронт знал цены без запроса.
// Если поменяешь на бэке — поменяй и здесь.
export const ECONOMY = {
  rewardSolved: 1,
  rewardSolvedFirst: 2,
  rewardStoryQuality: 3,
  costHint: 1,
  costSecondTry: 2,
  costStoryPublish: 1
};

export default state;
