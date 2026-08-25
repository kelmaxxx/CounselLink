-- Migration 036: Add post_at and remove_at to announcements for scheduled posting and auto-removal
ALTER TABLE announcements
  ADD COLUMN post_at DATETIME NULL AFTER date_posted,
  ADD COLUMN remove_at DATETIME NULL AFTER post_at;
