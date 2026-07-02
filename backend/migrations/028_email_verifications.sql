-- Migration 028: Signup email-mailbox verification (student self-registration)
-- Proves a student actually controls the MSU email they signed up with, by
-- emailing a 6-digit code they must confirm before the account is created.
-- Keyed by email (not user_id) because no user row exists yet at verify time.
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

CREATE TABLE IF NOT EXISTS email_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(120) NOT NULL,
  otp_code VARCHAR(8) NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  verified_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_emailverif_lookup (email, consumed_at, expires_at)
);
