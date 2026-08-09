-- Migration 034: Allow report_requests.counselor_id to be NULL so requests
-- can be broadcast to all counselors instead of requiring a specific one.
-- Any counselor can now see and claim an unassigned request.

USE counselink;

ALTER TABLE report_requests MODIFY COLUMN counselor_id INT NULL;
