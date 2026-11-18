-- Garmin's active calories are a daily total, separate from manual measurements.
-- Additive and safe to run again; no existing diary records are changed.
CREATE TABLE IF NOT EXISTS garmin_daily_calories (
  day TEXT PRIMARY KEY,
  active_kcal REAL NOT NULL CHECK (active_kcal >= 0 AND active_kcal <= 30000),
  synced_at TEXT NOT NULL
);
