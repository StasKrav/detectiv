import { api } from './api.js';
import { toast, escapeHtml } from './ui.js';
import { getUser, ECONOMY } from './state.js';

let view = 'open';   // 'open' | 'archive' | 'create'
let issueNumber = 1;

export async function renderStories() {
  const el = document.getElementById('tab-stories');
  el.innerHTML = '<div class="empty">Загрузка...</div>';

  try {
    const data = await api.getStories();
    issueNumber = data.issueNumber;
    renderStoriesView(el, data);
    bindStoriesEvents();
  } catch (e) {
    el.innerHTML = '<div class="empty">Ошибка: ' + escapeHtml(e.message) + '</div>';
  }
}

function renderStoriesView(el, data) {
  const { open, archive } = data;
  const list = view === 'archive' ? archive : open;

  let html = '<div class="issue-header" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:16px">'
    + '<h3 style="color:var(--blue);font-size:15px;margin-bottom:4px">Выпуск №' + issueNumber + '</h3>'
    + '<p class="muted-note">Разгадки — в следующем выпуске.</p>'
    + '</div>';

  html += '<div class="sub-nav">'
    + '<button data-sv="open" class="' + (view === 'open' ? 'active' : '') + '">Открытые (' + open.length + ')</button>'
    + '<button data-sv="archive" class="' + (view === 'archive' ? 'active' : '') + '">Прошлые выпуски (' + archive.length + ')</button>'
    + '<button data-sv="create" class="' + (view === 'create' ? 'active' : '') + '">+ Написать (' + ECONOMY.costStoryPublish + ' PUS)</button>'
    + '</div>';

  if (view === 'create') {
    html += renderCreateForm();
  } else if (list.length === 0) {
    html += '<div class="empty">Пока пусто</div>';
  } else {
    list.forEach(s => html += storyCard(s, view === 'archive'));
  }

  el.innerHTML = html;
}

function storyCard(s, closed) {
  const user = getUser();
  let body = '<div class="card">';
  if (s.title) body += '<h3>' + escapeHtml(s.title) + '</h3>';
  if (s.image) body += '<img src="' + escapeHtml(s.image) + '" class="story-img" alt="">';
  body += '<div class="story-text">' + escapeHtml(s.text) + '</div>';
  body += '<div class="meta">'
    + '<span class="tag">от ' + escapeHtml(s.author) + '</span>'
    + '<span class="tag ' + (closed ? 'closed' : 'hot') + '">' + (closed ? 'выпуск закрыт' : 'открыта') + '</span>'
    + '<span class="tag">' + s.versionsCount + ' версий</span>'
    + '</div>';

  if (!closed) {
    if (s.myVersion) {
      body += '<div class="version-item"><div class="author">Твоя версия:</div>' + escapeHtml(s.myVersion) + '</div>';
    } else if (user) {
      body += '<textarea data-version-input="' + s.id + '" placeholder="Напиши свою версию правды..."></textarea>'
        + '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">'
        + '<button class="btn primary" data-send-version="' + s.id + '">Отправить версию</button>'
        + (s.hint ? '<button class="btn ghost" data-story-hint="' + s.id + '">Подсказка (' + ECONOMY.costHint + ' PUS)</button>' : '')
        + '<button class="btn ghost" data-report-story="' + s.id + '">жалоба</button></div>';
    }
  } else {
    if (s.answer) {
      body += '<div class="answer-reveal">'
        + '<div class="label">Правильный ответ</div>'
        + '<div class="text">' + escapeHtml(s.answer) + '</div>'
        + '</div>';
    }
    if (s.versions && s.versions.length) {
      body += '<div style="margin-top:14px"><div class="muted-note" style="margin-bottom:6px">Версии:</div>';
      s.versions.forEach(v => {
        body += '<div class="version-item' + (v.isCorrect ? ' correct' : '') + '">'
          + '<div class="author">' + escapeHtml(v.author) + (v.isCorrect ? ' — верно' : '') + '</div>'
          + escapeHtml(v.text)
          + '</div>';
      });
      body += '</div>';
    }
  }

  body += '</div>';
  return body;
}

function renderCreateForm() {
  return '<div class="card">'
    + '<h3>Написать историю</h3>'
    + '<p class="muted-note" style="margin-bottom:12px">Публикация: <b style="color:var(--gold)">' + ECONOMY.costStoryPublish + ' PUS</b>.</p>'
    + '<label>Заголовок</label>'
    + '<input id="st-title" placeholder="например: Пропавшая брошь">'
    + '<label>Текст истории</label>'
    + '<textarea id="st-text" class="tall"></textarea>'
    + '<label>URL картинки (опционально)</label>'
    + '<input id="st-image" placeholder="https://...">'
    + '<label>Где ложь и почему</label>'
    + '<textarea id="st-answer"></textarea>'
    + '<label>Подсказка</label>'
    + '<input id="st-hint">'
    + '<div style="margin-top:18px"><button class="btn primary" id="st-submit">Опубликовать</button></div>'
    + '</div>';
}

export function bindStoriesEvents() {
  document.querySelectorAll('[data-sv]').forEach(b => {
    b.onclick = () => { view = b.dataset.sv; renderStories(); };
  });

  document.querySelectorAll('[data-send-version]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.sendVersion;
      const ta = document.querySelector('[data-version-input="' + id + '"]');
      const text = ta.value.trim();
      if (text.length < 10) return toast('Версия короткая');
      try {
        await api.sendStoryVersion(id, text);
        toast('Версия принята');
        await renderStories();
      } catch (e) {
        toast(e.message);
      }
    };
  });

  document.querySelectorAll('[data-story-hint]').forEach(btn => {
    btn.onclick = async () => {
      try {
        const r = await api.hintStory(btn.dataset.storyHint);
        toast('Подсказка: ' + r.hint);
        window.dispatchEvent(new Event('sherlock:update-header'));
      } catch (e) {
        toast(e.message);
      }
    };
  });

  document.querySelectorAll('[data-report-story]').forEach(btn => {
    btn.onclick = async () => {
      try {
        await api.reportStory(btn.dataset.reportStory);
        toast('Жалоба отправлена');
      } catch (e) {
        toast(e.message);
      }
    };
  });

  const submitBtn = document.getElementById('st-submit');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const title = document.getElementById('st-title').value.trim();
      const text = document.getElementById('st-text').value.trim();
      const image = document.getElementById('st-image').value.trim();
      const answer = document.getElementById('st-answer').value.trim();
      const hint = document.getElementById('st-hint').value.trim();

      if (text.length < 50) return toast('История короткая');
      if (answer.length < 10) return toast('Опиши ответ подробнее');

      try {
        await api.createStory({ title, text, image, answer, hint });
        toast('Опубликовано');
        view = 'open';
        const { user } = await api.me();
        const { setUser } = await import('./state.js');
        setUser(user);
        await renderStories();
        window.dispatchEvent(new Event('sherlock:update-header'));
      } catch (e) {
        toast(e.message);
      }
    };
  }
}
