import { api } from './api.js';
import { toast, escapeHtml, timeLeft } from './ui.js';
import { getUser, ECONOMY } from './state.js';

let view = 'active';   // 'active' | 'archive' | 'create'

export async function renderRiddles() {
  const el = document.getElementById('tab-riddles');
  el.innerHTML = '<div class="empty">Загрузка...</div>';

  try {
    const data = await api.getRiddles();
    renderRiddlesView(el, data);
    bindRiddlesEvents();   // ← привязываем события ПОСЛЕ рендера
  } catch (e) {
    el.innerHTML = '<div class="empty">Ошибка: ' + escapeHtml(e.message) + '</div>';
  }
}

function renderRiddlesView(el, data) {
  const { active, archive } = data;
  const list = view === 'archive' ? archive : active;

  let html = '<div class="sub-nav">'
    + '<button data-rv="active" class="' + (view === 'active' ? 'active' : '') + '">Активные (' + active.length + ')</button>'
    + '<button data-rv="archive" class="' + (view === 'archive' ? 'active' : '') + '">Архив (' + archive.length + ')</button>'
    + '<button data-rv="create" class="' + (view === 'create' ? 'active' : '') + '">+ Загадать</button>'
    + '</div>';

  if (view === 'create') {
    html += renderCreateForm();
  } else if (list.length === 0) {
    html += '<div class="empty">Пока пусто</div>';
  } else {
    list.forEach(r => html += riddleCard(r, view === 'archive'));
  }

  el.innerHTML = html;
}

function riddleCard(r, closed) {
  const user = getUser();
  const solvedByMe = r.solvedByMe;
  const tags = ['<span class="tag">от ' + escapeHtml(r.author) + '</span>'];
  if (!closed) tags.push('<span class="tag hot">' + timeLeft(r.createdAt, r.timeLimitMin) + '</span>');
  else tags.push('<span class="tag closed">закрыта</span>');
  tags.push('<span class="tag">отгадавших ' + r.solversCount + '/' + r.maxSolvers + '</span>');

  let body = '<div class="riddle-text">' + escapeHtml(r.text) + '</div>';
  body += '<div class="meta">' + tags.join('') + '</div>';

  if (!closed && !solvedByMe && user) {
    body += '<div class="input-row" style="margin-top:14px">'
      + '<input type="text" placeholder="Твой ответ..." data-answer-input="' + r.id + '">'
      + '<button class="btn primary" data-guess="' + r.id + '">Ответить</button></div>'
      + '<div class="input-row">'
      + '<button class="btn ghost" data-hint="' + r.id + '">Подсказка (' + ECONOMY.costHint + ' PUS)</button>'
      + '<button class="btn ghost" data-like="' + r.id + '">Like ' + r.likes + '</button>'
      + '<button class="btn ghost" data-report="' + r.id + '">жалоба</button></div>';
  } else if (solvedByMe) {
    body += '<div style="margin-top:12px"><span class="status-badge">Ты разгадал</span> '
      + '<button class="btn ghost small" data-like="' + r.id + '">Like ' + r.likes + '</button></div>';
  } else if (closed && r.answer) {
    body += '<div style="margin-top:12px;font-size:13px;color:var(--text-dim)">Ответ: <b style="color:var(--gold)">' + escapeHtml(r.answer) + '</b></div>';
  }

  return '<div class="card">' + body + '</div>';
}

function renderCreateForm() {
  return '<div class="card">'
    + '<h3>Загадать загадку</h3>'
    + '<p class="muted-note" style="margin-bottom:12px">Публикация бесплатная. За разгадки твоей загадки капают пуаросы.</p>'
    + '<label>Текст загадки</label>'
    + '<textarea id="c-text" placeholder="Опиши загадку..."></textarea>'
    + '<label>Правильный ответ</label>'
    + '<input id="c-answer" placeholder="например: имя">'
    + '<label>Подсказка (опционально)</label>'
    + '<input id="c-hint" placeholder="намёк">'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:140px"><label>Время (мин)</label><input id="c-time" type="number" value="60" min="1"></div>'
    + '<div style="flex:1;min-width:140px"><label>Макс. разгадавших</label><input id="c-solvers" type="number" value="5" min="1"></div>'
    + '</div>'
    + '<div style="margin-top:18px"><button class="btn primary" id="c-submit">Опубликовать</button></div>'
    + '</div>';
}

export function bindRiddlesEvents() {
  // Переключение подвкладок
  document.querySelectorAll('[data-rv]').forEach(b => {
    b.onclick = () => { view = b.dataset.rv; renderRiddles(); };
  });

  // Ответить на загадку
  document.querySelectorAll('[data-guess]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.guess;
      const input = document.querySelector('[data-answer-input="' + id + '"]');
      const answer = input.value.trim();
      if (!answer) return toast('Введи ответ');

      try {
        const result = await api.guessRiddle(id, answer);
        if (result.correct) {
          toast('Верно! +' + result.reward + ' PUS' + (result.isFirst ? ' (первый!)' : ''), true);
          const { user } = await api.me();
          const { setUser } = await import('./state.js');
          setUser(user);
        } else {
          toast('Неверно');
        }
        await renderRiddles();
        window.dispatchEvent(new Event('sherlock:update-header'));
      } catch (e) {
        toast(e.message);
      }
    };
  });

  // Подсказка
  document.querySelectorAll('[data-hint]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.hint;
      try {
        const result = await api.hintRiddle(id);
        toast('Подсказка: ' + result.hint);
        const { user } = await api.me();
        const { setUser } = await import('./state.js');
        setUser(user);
        window.dispatchEvent(new Event('sherlock:update-header'));
      } catch (e) {
        toast(e.message);
      }
    };
  });

  // Лайк
  document.querySelectorAll('[data-like]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.like;
      try {
        await api.likeRiddle(id);
        await renderRiddles();
      } catch (e) {
        toast(e.message);
      }
    };
  });

  // Жалоба
  document.querySelectorAll('[data-report]').forEach(btn => {
    btn.onclick = async () => {
      try {
        await api.reportRiddle(btn.dataset.report);
        toast('Жалоба отправлена');
      } catch (e) {
        toast(e.message);
      }
    };
  });

  // Публикация
  const submitBtn = document.getElementById('c-submit');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const text = document.getElementById('c-text').value.trim();
      const answer = document.getElementById('c-answer').value.trim();
      const hint = document.getElementById('c-hint').value.trim();
      const timeLimitMin = parseInt(document.getElementById('c-time').value) || 60;
      const maxSolvers = parseInt(document.getElementById('c-solvers').value) || 5;

      if (text.length < 15) return toast('Текст короткий');
      if (answer.length < 2) return toast('Ответ короткий');

      try {
        await api.createRiddle({ text, answer, hint, timeLimitMin, maxSolvers });
        toast('Опубликовано');
        view = 'active';
        await renderRiddles();
        window.dispatchEvent(new Event('sherlock:update-header'));
      } catch (e) {
        toast(e.message);
      }
    };
  }
}
