-- Migration 030: Support per-test feedback (one feedback per psychological test result).

USE counselink;

-- Add test_id column
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_feedback_forms'
    AND COLUMN_NAME = 'test_id'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE client_feedback_forms ADD COLUMN test_id INT NULL AFTER session_id',
  'SELECT 1');
PREPARE stmt FROM @add_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add unique key: one feedback per student per test result
SET @has_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_feedback_forms'
    AND INDEX_NAME = 'uq_cff_student_test'
);
SET @add_uq := IF(@has_uq = 0,
  'ALTER TABLE client_feedback_forms ADD UNIQUE KEY uq_cff_student_test (student_id, test_id)',
  'SELECT 1');
PREPARE stmt FROM @add_uq; EXECUTE stmt; DEALLOCATE PREPARE stmt;
