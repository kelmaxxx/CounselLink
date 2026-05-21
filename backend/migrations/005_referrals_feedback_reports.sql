-- Migration 005: Add referrals, feedback, report_recipients (Client Feedback Sprint)
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

CREATE TABLE IF NOT EXISTS referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  referring_counselor_id INT NOT NULL,
  receiving_counselor_id INT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status ENUM('pending','accepted','rejected','cancelled') DEFAULT 'pending',
  decision_note TEXT,
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (referring_counselor_id) REFERENCES users(id),
  FOREIGN KEY (receiving_counselor_id) REFERENCES users(id),
  INDEX idx_referral_receiver (receiving_counselor_id, status),
  INDEX idx_referral_sender (referring_counselor_id, status),
  INDEX idx_referral_student (student_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  appointment_id INT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_feedback_counselor (counselor_id, created_at),
  INDEX idx_feedback_student (student_id, created_at),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS report_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  report_payload JSON NOT NULL,
  status ENUM('sent','acknowledged') DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  INDEX idx_report_recipient (recipient_id, status),
  INDEX idx_report_sender (sender_id, sent_at)
);
