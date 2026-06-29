-- Migration 022: Let counselors attach a photo or document (e.g. a scanned
-- answer sheet) when releasing a psychological test result.
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

ALTER TABLE test_results
  ADD COLUMN result_file_url VARCHAR(255) NULL,
  ADD COLUMN result_file_name VARCHAR(255) NULL,
  ADD COLUMN result_file_type VARCHAR(100) NULL;
