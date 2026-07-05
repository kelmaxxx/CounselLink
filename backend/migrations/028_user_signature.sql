-- 028_user_signature.sql
-- Digital signature image for counselors and students. Stored like the avatar
-- (a file under /uploads/signatures) and stamped onto generated documents.
USE counselink;

ALTER TABLE users
  ADD COLUMN signature_url VARCHAR(512) NULL,
  ADD COLUMN signature_file_name VARCHAR(255) NULL,
  ADD COLUMN signature_file_type VARCHAR(100) NULL;
