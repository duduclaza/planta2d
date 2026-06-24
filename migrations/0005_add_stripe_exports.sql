ALTER TABLE payment_exports ADD COLUMN provider TEXT NOT NULL DEFAULT 'pagbank';
ALTER TABLE payment_exports ADD COLUMN stripe_session_id TEXT;
ALTER TABLE payment_exports ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE payment_exports ADD COLUMN checkout_url TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_exports_stripe_session_id ON payment_exports(stripe_session_id);
