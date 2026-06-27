-- Migration 024: Enforce one feedback row per student-counselor pair (upsert semantics).
-- Deduplicates existing rows (keeps the latest by id), then adds the unique key.

-- 1. Remove duplicate rows, keeping only the most recent per student-counselor pair.
DELETE FROM client_feedback_forms
WHERE id NOT IN (
  SELECT id FROM (
    SELECT MAX(id) AS id
    FROM client_feedback_forms
    GROUP BY student_id, counselor_id
  ) AS keep
);

-- 2. Add unique constraint (guarded for re-run safety).
SET @has_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_feedback_forms'
    AND INDEX_NAME = 'uq_cff_student_counselor'
);
SET @add_uq := IF(@has_uq = 0,
  'ALTER TABLE client_feedback_forms ADD UNIQUE KEY uq_cff_student_counselor (student_id, counselor_id)',
  'SELECT 1');
PREPARE stmt FROM @add_uq; EXECUTE stmt; DEALLOCATE PREPARE stmt;
