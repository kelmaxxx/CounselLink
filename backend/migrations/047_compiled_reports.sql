-- Migration 047: Counselor-compiled reports (Counseling / Psychological /
-- Student Individual Profile), stored so the counselor can re-download them.
-- Run on existing databases. New installs get this from schema.sql.

USE counselink;

CREATE TABLE IF NOT EXISTS compiled_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  counselor_id INT NOT NULL,
  report_type ENUM('counseling','psychological','profile') NOT NULL,
  college VARCHAR(40) NOT NULL,
  period_label VARCHAR(120) NULL,
  date_from DATE NULL,
  date_to DATE NULL,
  title VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_compiled_counselor (counselor_id, created_at)
);
