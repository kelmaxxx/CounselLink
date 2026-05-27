-- Migration 010: Referral state machine + appointment link
-- Adds 'rescheduled' to the referrals status enum and links auto-created
-- appointments back to their originating referral so we can trace
-- session -> referral -> rep for the Phase 2 report fan-out.

USE counselink;

-- 1. Extend referrals.status enum with 'rescheduled'. MODIFY is idempotent
--    when the target enum matches the current definition.
ALTER TABLE referrals
  MODIFY COLUMN status
  ENUM('pending','accepted','rejected','rescheduled','cancelled')
  DEFAULT 'pending';

-- 2. Add appointments.referral_id (nullable so non-referral appointments
--    keep working). Guarded by information_schema check for re-run safety.
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'referral_id'
);
SET @add_col := IF(@has_col = 0,
  'ALTER TABLE appointments ADD COLUMN referral_id INT NULL AFTER counselor_id',
  'SELECT 1');
PREPARE stmt FROM @add_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. FK appointments.referral_id -> referrals.id (ON DELETE SET NULL so
--    a deleted referral does not cascade-delete its appointment).
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'referral_id'
    AND REFERENCED_TABLE_NAME = 'referrals'
);
SET @add_fk := IF(@has_fk = 0,
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @add_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Index for lookups by referral (Phase 2 will trace session -> referral).
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND INDEX_NAME = 'idx_appointment_referral'
);
SET @add_idx := IF(@has_idx = 0,
  'ALTER TABLE appointments ADD INDEX idx_appointment_referral (referral_id)',
  'SELECT 1');
PREPARE stmt FROM @add_idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;
