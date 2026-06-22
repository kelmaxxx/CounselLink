-- Migration 020: Referral-sharing consent + student link on report requests
-- (Privacy controls for reports sent to College Representatives.)
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

ALTER TABLE student_consents
  ADD COLUMN referral_sharing_consent ENUM('yes','no') NULL,
  ADD COLUMN referral_sharing_decided_at TIMESTAMP NULL;

ALTER TABLE report_requests
  ADD COLUMN student_id INT NULL,
  ADD CONSTRAINT fk_report_requests_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL;
