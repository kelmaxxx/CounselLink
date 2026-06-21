-- Migration 018: Client Feedback Form (formal 12-item counseling relationship
-- + outcomes survey, overall satisfaction, recommend, and comments).
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

CREATE TABLE IF NOT EXISTS client_feedback_forms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  appointment_id INT NULL,
  responses JSON NOT NULL,
  overall_satisfaction TINYINT NOT NULL,
  would_recommend ENUM('yes','no','not_sure') NOT NULL,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_cff_counselor (counselor_id, created_at),
  INDEX idx_cff_student (student_id, created_at)
);
