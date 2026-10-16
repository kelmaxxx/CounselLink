-- Migration 037: College rep sets the preferred schedule when creating a referral,
-- so counselor Accept is a direct approve (no schedule picker). Only Reschedule
-- sets a new date/time.

USE counselink;

SET @has_req_date := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'referrals'
    AND COLUMN_NAME = 'requested_date'
);
SET @add_req_date := IF(@has_req_date = 0,
  'ALTER TABLE referrals ADD COLUMN requested_date DATE NULL',
  'SELECT 1');
PREPARE stmt FROM @add_req_date; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_req_time := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'referrals'
    AND COLUMN_NAME = 'requested_time'
);
SET @add_req_time := IF(@has_req_time = 0,
  'ALTER TABLE referrals ADD COLUMN requested_time VARCHAR(32) NULL',
  'SELECT 1');
PREPARE stmt FROM @add_req_time; EXECUTE stmt; DEALLOCATE PREPARE stmt;
