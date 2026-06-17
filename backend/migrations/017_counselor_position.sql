-- Migration 017: Add counselor "position" field (Section Chief, Guidance Service Specialist I-V)
-- Run on existing databases. New installs get this column from schema.sql automatically.

USE counselink;

ALTER TABLE users ADD COLUMN position VARCHAR(60) NULL AFTER specialization;
