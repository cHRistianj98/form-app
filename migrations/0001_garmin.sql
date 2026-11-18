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
