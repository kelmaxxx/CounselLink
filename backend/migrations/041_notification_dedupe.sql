-- Migration 041: Notification de-duplication.
-- Outcome and monitoring notifications must not be sent twice for the same
-- event (repeat saves, repeated sweeps, refreshed requests). A nullable unique
-- key lets callers opt in without touching existing notifications.
-- MySQL allows multiple NULLs in a UNIQUE index, so ordinary notifications are
-- unaffected.

USE counselink;

ALTER TABLE notifications
  ADD COLUMN dedupe_key VARCHAR(191) NULL,
  ADD UNIQUE KEY uq_notifications_dedupe (dedupe_key);
