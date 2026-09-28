-- ==================== ПОЛЬЗОВАТЕЛИ ====================
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  balance       INTEGER NOT NULL DEFAULT 10,
  solved        INTEGER NOT NULL DEFAULT 0,
  authored      INTEGER NOT NULL DEFAULT 0,
  stories_written INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ==================== ЗАГАДКИ ====================
CREATE TABLE IF NOT EXISTS riddles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id      INTEGER NOT NULL,
  text           TEXT NOT NULL,
  answer         TEXT NOT NULL,
  hint           TEXT DEFAULT '',
  time_limit_min INTEGER NOT NULL DEFAULT 60,
  max_solvers    INTEGER NOT NULL DEFAULT 5,
  created_at     INTEGER NOT NULL,
  closed         INTEGER NOT NULL DEFAULT 0,
  likes          INTEGER NOT NULL DEFAULT 0,
  attempts       INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_riddles_author ON riddles(author_id);
CREATE INDEX IF NOT EXISTS idx_riddles_created ON riddles(created_at);

-- ==================== КТО РАЗГАДАЛ ЗАГАДКУ ====================
CREATE TABLE IF NOT EXISTS riddle_solvers (
  riddle_id INTEGER NOT NULL,
  user_id   INTEGER NOT NULL,
  solved_at INTEGER NOT NULL,
  PRIMARY KEY (riddle_id, user_id),
  FOREIGN KEY (riddle_id) REFERENCES riddles(id),
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

-- ==================== ИСТОРИИ ====================
CREATE TABLE IF NOT EXISTS stories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id    INTEGER NOT NULL,
  title        TEXT DEFAULT '',
  text         TEXT NOT NULL,
  image_url    TEXT DEFAULT '',
  answer       TEXT NOT NULL,
  hint         TEXT DEFAULT '',
  issue_number INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL,
  closed       INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_issue  ON stories(issue_number);

-- ==================== ВЕРСИИ ИГРОКОВ ====================
CREATE TABLE IF NOT EXISTS story_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  text       TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories(id),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  UNIQUE (story_id, user_id)
);

-- ==================== ТРАНЗАКЦИИ ПУАРОСОВ ====================
CREATE TABLE IF NOT EXISTS transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- ==================== ЛАЙКИ ====================
CREATE TABLE IF NOT EXISTS likes (
  riddle_id INTEGER NOT NULL,
  user_id   INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (riddle_id, user_id),
  FOREIGN KEY (riddle_id) REFERENCES riddles(id),
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

-- ==================== ВЫПУСКИ ====================
CREATE TABLE IF NOT EXISTS issues (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  number     INTEGER UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  closed_at  INTEGER
);

-- Первый выпуск — создадим сразу
INSERT OR IGNORE INTO issues (number, created_at) VALUES (1, strftime('%s', 'now') * 1000);
