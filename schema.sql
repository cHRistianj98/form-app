CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  meal TEXT NOT NULL,
  grams REAL NOT NULL CHECK(grams > 0 AND grams <= 100000),
  food_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(day);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  type TEXT NOT NULL,
  minutes REAL NOT NULL DEFAULT 0,
  distance REAL NOT NULL DEFAULT 0,
  kcal REAL NOT NULL DEFAULT 0,
  included_in_steps INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activities_day ON activities(day);

CREATE TABLE IF NOT EXISTS daily_metrics (
  day TEXT PRIMARY KEY,
  steps INTEGER NOT NULL DEFAULT 0,
  weight REAL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  food_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- Additive migration: existing diary records and notes remain unchanged.
CREATE TABLE IF NOT EXISTS garmin_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auto_enabled INTEGER NOT NULL DEFAULT 0,
  last_attempt TEXT,
  last_success TEXT,
  last_result_json TEXT,
  last_error_code TEXT,
  next_allowed_at INTEGER NOT NULL DEFAULT 0,
  lock_id TEXT,
  lock_until INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO garmin_sync_state (id) VALUES (1);

CREATE TABLE IF NOT EXISTS garmin_daily_imports (
  day TEXT PRIMARY KEY,
  steps INTEGER,
  weight REAL,
  steps_run TEXT,
  weight_run TEXT
);
