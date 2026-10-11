-- 033_report_request_letters.sql
-- Formal request-letter flow (adviser/client requirement):
-- freeze each college data request as a formal letter snapshot, keep the
-- rep's saved e-signature on the request, and record Data Privacy Act
-- acknowledgement before the data is opened.
USE counselink;

ALTER TABLE report_requests
  ADD COLUMN letter_snapshot JSON NULL AFTER response_note,
  ADD COLUMN rep_signature_url VARCHAR(512) NULL AFTER letter_snapshot,
  ADD COLUMN privacy_ack_at TIMESTAMP NULL AFTER rep_signature_url,
  ADD COLUMN privacy_ack_ip VARCHAR(45) NULL AFTER privacy_ack_at;
