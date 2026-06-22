-- Migration 021: Track when a student registration was approved, separate
-- from updated_at (which also changes on unrelated profile edits), so admin
-- stats like "approved this week" stay accurate after later edits.
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

ALTER TABLE users ADD COLUMN approved_at TIMESTAMP NULL;
