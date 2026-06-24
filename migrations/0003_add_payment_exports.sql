CREATE TABLE IF NOT EXISTS payment_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference_id TEXT NOT NULL UNIQUE,
  pagbank_order_id TEXT NOT NULL,
  pagbank_qr_id TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'WAITING',
  qr_text TEXT,
  qr_png_url TEXT,
  payload TEXT,
  expires_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_exports_user_created_at ON payment_exports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_exports_order_id ON payment_exports(pagbank_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_exports_reference_id ON payment_exports(reference_id);
