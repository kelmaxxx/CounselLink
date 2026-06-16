-- Migration 013: Report requests can be for one student or the whole college.
-- Adds a request_type discriminator and relaxes student_name to NULL so a
-- college-wide summary request (no individual student) can be stored.

USE counselink;

-- Add request_type only if it doesn't already exist.
SET @has_type := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'report_requests'
    AND COLUMN_NAME = 'request_type'
);
SET @add_type := IF(@has_type = 0,
  'ALTER TABLE report_requests ADD COLUMN request_type ENUM(''individual'',''college'') NOT NULL DEFAULT ''individual'' AFTER counselor_id',
  'SELECT 1');
PREPARE stmt FROM @add_type; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Allow student_name to be NULL for college-wide requests.
ALTER TABLE report_requests
  MODIFY COLUMN student_name VARCHAR(255) NULL;
