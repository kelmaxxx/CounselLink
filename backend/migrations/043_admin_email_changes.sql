-- Migration 043: Verified administrator email changes.
-- Official staff email addresses can no longer be edited through ordinary
-- profile updates. An administrator changes their own email by re-entering
-- their password, then confirming a one-time code sent to the new address.
-- Codes are stored hashed; rows stay for the rate limits and audit trail.

USE counselink;

CREATE TABLE IF NOT EXISTS admin_email_changes (
  id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  new_email   VARCHAR(120) NOT NULL,
  code_hash   CHAR(64)     NOT NULL,
  attempts    INT          NOT NULL DEFAULT 0,
  expires_at  DATETIME     NOT NULL,
  requested_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at DATETIME     NULL,
  INDEX idx_admin_email_change_user (user_id, requested_at),
  CONSTRAINT fk_admin_email_change_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
