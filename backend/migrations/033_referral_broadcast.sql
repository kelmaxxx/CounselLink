-- Migration 033: Make receiving_counselor_id nullable so referrals broadcast to all counselors.
-- Any counselor can accept an unassigned (NULL) referral; the first to accept claims it.

USE counselink;

ALTER TABLE referrals
  MODIFY COLUMN receiving_counselor_id INT NULL;
