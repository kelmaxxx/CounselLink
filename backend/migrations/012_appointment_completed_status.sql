-- Migration 012: Add 'completed' to appointments status enum
-- Counselor can now mark approved referred appointments as completed, which
-- frees up the session to be finalized into a per-student report.

USE counselink;

ALTER TABLE appointments
  MODIFY COLUMN status
  ENUM('pending','approved','rejected','rescheduled','completed')
  DEFAULT 'pending';
