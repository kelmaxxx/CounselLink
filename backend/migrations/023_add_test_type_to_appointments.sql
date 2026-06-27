-- Migration 023: Add test_type column to appointments for psychological test sub-type
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'test_type'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE appointments ADD COLUMN test_type VARCHAR(100) NULL AFTER appointment_type',
  'SELECT 1');
PREPARE stmt FROM @add_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;
