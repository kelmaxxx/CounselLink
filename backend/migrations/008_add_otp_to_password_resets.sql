-- Migration 008: Add OTP gating to password resets
-- Run on existing databases. New installs get these columns from schema.sql automatically.
-- Existing rows will get NULL for otp_code (treat as expired by the controller).

USE counselink;

ALTER TABLE password_resets
  ADD COLUMN otp_code VARCHAR(8) NULL AFTER token_hash,
  ADD COLUMN otp_verified_at DATETIME NULL AFTER otp_code,
  ADD COLUMN otp_attempts INT NOT NULL DEFAULT 0 AFTER otp_verified_at;

CREATE INDEX idx_pwreset_email_lookup ON password_resets (user_id, used_at, expires_at);
