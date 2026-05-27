-- Migration 009: College Reps are the referrers (not counselors).
-- Renames referring_counselor_id -> referrer_id and adds a report_requests
-- table so reps can request reports from a specific counselor.

USE counselink;

-- Drop FK + index that depend on the old column name (names follow MySQL's
-- auto-generated convention; the table was created in migration 005).
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'referrals'
    AND COLUMN_NAME = 'referring_counselor_id'
    AND REFERENCED_TABLE_NAME = 'users'
  LIMIT 1
);
SET @drop_fk := IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE referrals DROP FOREIGN KEY ', @fk_name),
  'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'referrals'
    AND INDEX_NAME = 'idx_referral_sender'
);
SET @drop_idx := IF(@has_idx > 0,
  'ALTER TABLE referrals DROP INDEX idx_referral_sender',
  'SELECT 1');
PREPARE stmt FROM @drop_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE referrals
  CHANGE COLUMN referring_counselor_id referrer_id INT NOT NULL;

ALTER TABLE referrals
  ADD CONSTRAINT fk_referrals_referrer
  FOREIGN KEY (referrer_id) REFERENCES users(id);

ALTER TABLE referrals
  ADD INDEX idx_referral_referrer (referrer_id, status);

CREATE TABLE IF NOT EXISTS report_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id INT NOT NULL,
  counselor_id INT NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  student_identifier VARCHAR(100),
  reason TEXT NOT NULL,
  status ENUM('pending','fulfilled','declined','cancelled') DEFAULT 'pending',
  response_note TEXT,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  INDEX idx_report_request_counselor (counselor_id, status),
  INDEX idx_report_request_requester (requester_id, status)
);
