-- Migration 001: Add profile fields to users (Milestone 1.2)
-- Run this on existing databases that already have the users table.
-- New installs get these columns from schema.sql automatically.

USE counselink;

ALTER TABLE users
  ADD COLUMN bio TEXT NULL AFTER year_level,
  ADD COLUMN department VARCHAR(120) NULL AFTER bio,
  ADD COLUMN specialization VARCHAR(200) NULL AFTER department,
  ADD COLUMN employee_id VARCHAR(30) NULL AFTER specialization;
