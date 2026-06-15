-- Migration 015: Fold urgent counseling requests into appointments
-- Urgent requests from the login page now create a 'pending', is_urgent=1
-- appointment (and a placeholder student record if the student ID isn't
-- already registered), instead of a separate table.

USE counselink;

ALTER TABLE users ADD COLUMN is_placeholder TINYINT(1) NOT NULL DEFAULT 0;

DROP TABLE IF EXISTS urgent_counseling_requests;
