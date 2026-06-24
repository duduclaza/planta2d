CREATE TABLE IF NOT EXISTS styled_furniture_assets (
  id TEXT PRIMARY KEY,
  folder TEXT NOT NULL,
  filename TEXT NOT NULL,
  furniture_kind TEXT NOT NULL,
  label TEXT,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  data_base64 TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(folder, filename)
);

CREATE INDEX IF NOT EXISTS idx_styled_furniture_assets_kind ON styled_furniture_assets(furniture_kind);
