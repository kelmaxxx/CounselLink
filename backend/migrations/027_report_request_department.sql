-- 027_report_request_department.sql
-- Support department-scoped data requests (for per-department accreditation):
-- add a 'department' request type and a nullable department column that records
-- which department within the requester's college the summary is scoped to.
USE counselink;

ALTER TABLE report_requests
  MODIFY COLUMN request_type ENUM('individual','college','department') NOT NULL DEFAULT 'individual';

ALTER TABLE report_requests
  ADD COLUMN department VARCHAR(120) NULL AFTER student_identifier;
