ALTER TABLE payment_exports ADD COLUMN efi_txid TEXT;
ALTER TABLE payment_exports ADD COLUMN efi_loc_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_exports_efi_txid ON payment_exports(efi_txid);
