-- Migration 035: Store the referring student's department on the referral row
-- so counselors can see which department the referred student belongs to.

USE counselink;

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'referrals'
    AND COLUMN_NAME = 'student_department'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE referrals ADD COLUMN student_department VARCHAR(255) NULL',
  'SELECT 1');
PREPARE stmt FROM @add_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;
