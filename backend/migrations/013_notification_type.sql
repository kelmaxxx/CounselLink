-- Migration 013: Add `type` to notifications
-- Lets notifications render with distinct styling (e.g. urgent counseling
-- alerts use red/alert styling via the TYPE_META map in NotificationsView).

USE counselink;

ALTER TABLE notifications
  ADD COLUMN type VARCHAR(30) DEFAULT 'info' AFTER link;
