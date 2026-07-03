-- Migration 029: Change client feedback from one-per-student-counselor to one-per-session.
-- A student with multiple counseling sessions can now give one feedback per session.

USE counselink;

-- Add session_id column
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_feedback_forms'
    AND COLUMN_NAME = 'session_id'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE client_feedback_forms ADD COLUMN session_id INT NULL AFTER appointment_id',
  'SELECT 1');
PREPARE stmt FROM @add_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop the old per-student-counselor unique key
SET @has_old := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_feedback_forms'
    AND INDEX_NAME = 'uq_cff_student_counselor'
);
SET @drop_old := IF(@has_old > 0,
  'ALTER TABLE client_feedback_forms DROP INDEX uq_cff_student_counselor',
  'SELECT 1');
PREPARE stmt FROM @drop_old; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add new per-session unique key (NULL session_id values are not deduplicated in MySQL)
SET @has_new := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_feedback_forms'
    AND INDEX_NAME = 'uq_cff_student_session'
);
SET @add_new := IF(@has_new = 0,
  'ALTER TABLE client_feedback_forms ADD UNIQUE KEY uq_cff_student_session (student_id, session_id)',
  'SELECT 1');
PREPARE stmt FROM @add_new; EXECUTE stmt; DEALLOCATE PREPARE stmt;
