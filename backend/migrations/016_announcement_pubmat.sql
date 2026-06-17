-- Migration 016: Add Pubmat (event image) support to announcements
-- Run on existing databases. New installs get these columns from schema.sql automatically.

USE counselink;

ALTER TABLE announcements ADD COLUMN image_url VARCHAR(512) NULL AFTER content;
ALTER TABLE notifications ADD COLUMN image_url VARCHAR(512) NULL AFTER link;
