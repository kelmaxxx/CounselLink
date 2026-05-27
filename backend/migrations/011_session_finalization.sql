-- Migration 011: Session finalization (Phase 2 of the Referral → Appointment
-- → Report → Student Record lifecycle).
-- Adds counseling_sessions.finalized_at so a session can be marked as a
-- "submitted Session Report". Once finalized, the row becomes the immutable
-- Student Record entry and edits are rejected at the controller layer.

USE counselink;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'counseling_sessions'
    AND COLUMN_NAME = 'finalized_at'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE counseling_sessions ADD COLUMN finalized_at TIMESTAMP NULL AFTER form_data',
  'SELECT 1');
PREPARE stmt FROM @add_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Index for "fetch finalized sessions for this student" lookups (Student
-- Record page) and "fan-out audit" queries.
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'counseling_sessions'
    AND INDEX_NAME = 'idx_session_finalized'
);
SET @add_idx := IF(@has_idx = 0,
  'ALTER TABLE counseling_sessions ADD INDEX idx_session_finalized (student_id, finalized_at)',
  'SELECT 1');
PREPARE stmt FROM @add_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;
