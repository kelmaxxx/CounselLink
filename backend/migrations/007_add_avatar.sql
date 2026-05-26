-- Migration 007: Add profile-picture (avatar) fields to users
-- Run on existing databases. New installs get these columns from schema.sql automatically.

USE counselink;

ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(512) NULL AFTER cor_file_type,
  ADD COLUMN avatar_file_name VARCHAR(255) NULL AFTER avatar_url,
  ADD COLUMN avatar_file_type VARCHAR(100) NULL AFTER avatar_file_name;
