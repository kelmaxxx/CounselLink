-- Migration 014: Urgent counseling requests
-- Stores the structured intake form submitted from the login page's urgent
-- counseling flow, with a 'pending'/'resolved' lifecycle keyed by student ID
-- so repeat submissions while a request is still pending don't re-notify
-- counselors.

USE counselink;

CREATE TABLE IF NOT EXISTS urgent_counseling_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  student_id_number VARCHAR(50) NOT NULL,
  college VARCHAR(100) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  nature_of_concern VARCHAR(100) NOT NULL,
  nature_of_concern_other VARCHAR(255),
  description TEXT NOT NULL,
  status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  resolved_by INT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  INDEX idx_urgent_student_status (student_id_number, status)
);
