-- Migration 038: Consent revocation request workflow
-- Students request revocation; counselors approve or reject.
-- The consent record itself is only updated when a counselor approves.

USE counselink;

-- Table to store each student-initiated revocation request
SET @has_table := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'consent_revocation_requests'
);
SET @create_table := IF(@has_table = 0,
  'CREATE TABLE consent_revocation_requests (
    id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    consent_id      INT          NOT NULL,
    student_id      INT          NOT NULL,
    status          ENUM(''pending'',''approved'',''rejected'') NOT NULL DEFAULT ''pending'',
    requested_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_by      INT          NULL,
    decided_at      TIMESTAMP    NULL,
    rejection_reason TEXT        NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_crr_consent  FOREIGN KEY (consent_id)   REFERENCES student_consents(id) ON DELETE CASCADE,
    CONSTRAINT fk_crr_student  FOREIGN KEY (student_id)   REFERENCES users(id)            ON DELETE CASCADE,
    CONSTRAINT fk_crr_decider  FOREIGN KEY (decided_by)   REFERENCES users(id)            ON DELETE SET NULL,
    -- Only one pending request per consent at a time
    CONSTRAINT uq_crr_pending  UNIQUE (consent_id, status)
  )',
  'SELECT 1'
);
PREPARE stmt FROM @create_table;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
