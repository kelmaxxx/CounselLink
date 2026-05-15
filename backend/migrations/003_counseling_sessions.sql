-- Migration 003: Add counseling_sessions table (Milestone 2.2)
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

CREATE TABLE IF NOT EXISTS counseling_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  appointment_id INT NULL,
  session_date DATE NOT NULL,
  presenting_concern TEXT,
  goals TEXT,
  summary TEXT,
  plan TEXT,
  comments TEXT,
  next_session ENUM('followup','termination') DEFAULT 'followup',
  counselor_signature VARCHAR(120),
  form_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_session_student (student_id),
  INDEX idx_session_counselor (counselor_id),
  INDEX idx_session_date (session_date)
);
