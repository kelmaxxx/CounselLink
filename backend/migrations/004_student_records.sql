-- Migration 004: Add student_inventories + student_consents (Milestone 2.3)
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

CREATE TABLE IF NOT EXISTS student_inventories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  counselor_id INT NULL,
  form_data JSON,
  scan_url VARCHAR(255),
  scan_filename VARCHAR(255),
  scan_filetype VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_consents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  e_consent_signed_at TIMESTAMP NULL,
  e_consent_typed_name VARCHAR(120),
  e_consent_ip VARCHAR(45),
  scan_url VARCHAR(255),
  scan_filename VARCHAR(255),
  scan_filetype VARCHAR(100),
  uploaded_by INT NULL,
  uploaded_at TIMESTAMP NULL,
  scope TEXT,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
