-- Migration 006: Self-service password reset tokens (Client Feedback Sprint)
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_token (token_hash),
  INDEX idx_pwreset_user (user_id, used_at)
);
