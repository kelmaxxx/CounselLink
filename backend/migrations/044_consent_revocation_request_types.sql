-- Migration 044: Split consent revocation requests by type.
-- Students can request revocation of their informed consent and of their
-- inventory data authorization independently, so the counselor approves one
-- without revoking the other. Only one pending request per type is allowed;
-- multiple rejected/approved requests are kept for the audit trail.

USE counselink;

SET @has_type := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_revocation_requests'
    AND COLUMN_NAME = 'request_type'
);
SET @add_type := IF(@has_type = 0,
  'ALTER TABLE consent_revocation_requests ADD COLUMN request_type ENUM(''consent'',''authorization'') NOT NULL DEFAULT ''consent'' AFTER consent_id',
  'SELECT 1');
PREPARE stmt FROM @add_type; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Generated key is the request type only while pending, so the unique index
-- blocks a second pending request but still allows new rows after a decision.
SET @has_pending_key := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_revocation_requests'
    AND COLUMN_NAME = 'pending_key'
);
SET @add_pending_key := IF(@has_pending_key = 0,
  'ALTER TABLE consent_revocation_requests ADD COLUMN pending_key VARCHAR(20) GENERATED ALWAYS AS (IF(status = ''pending'', request_type, NULL)) STORED',
  'SELECT 1');
PREPARE stmt FROM @add_pending_key; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add the replacement index first: the old unique index is also the index
-- InnoDB uses for the consent_id foreign key, so it cannot be dropped until
-- another index starting with consent_id exists.
SET @has_new_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_revocation_requests'
    AND INDEX_NAME = 'uq_crr_pending_type'
);
SET @add_new_index := IF(@has_new_index = 0,
  'ALTER TABLE consent_revocation_requests ADD UNIQUE KEY uq_crr_pending_type (consent_id, pending_key)',
  'SELECT 1');
PREPARE stmt FROM @add_new_index; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_old_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_revocation_requests'
    AND INDEX_NAME = 'uq_crr_pending'
);
SET @drop_old_index := IF(@has_old_index > 0,
  'ALTER TABLE consent_revocation_requests DROP INDEX uq_crr_pending',
  'SELECT 1');
PREPARE stmt FROM @drop_old_index; EXECUTE stmt; DEALLOCATE PREPARE stmt;
