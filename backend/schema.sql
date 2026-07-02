CREATE DATABASE IF NOT EXISTS counselink;
USE counselink;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','counselor','admin','college_rep') NOT NULL,
  status ENUM('pending_approval','approved','rejected','banned') DEFAULT 'approved',
  college VARCHAR(50),
  student_id VARCHAR(30),
  phone VARCHAR(30),
  cor_url VARCHAR(255),
  cor_file_name VARCHAR(255),
  cor_file_type VARCHAR(100),
  avatar_url VARCHAR(512),
  avatar_file_name VARCHAR(255),
  avatar_file_type VARCHAR(100),
  program VARCHAR(120),
  year_level VARCHAR(30),
  bio TEXT,
  department VARCHAR(120),
  specialization VARCHAR(200),
  position VARCHAR(60),
  employee_id VARCHAR(30),
  rejection_reason TEXT,
  is_placeholder TINYINT(1) NOT NULL DEFAULT 0,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NULL,
  referral_id INT NULL,
  appointment_type ENUM('counseling','psychological_test') NOT NULL,
  test_type VARCHAR(100) NULL,
  preferred_date DATE,
  preferred_time TIME,
  preferred_slots VARCHAR(255),
  scheduled_date DATE,
  scheduled_time VARCHAR(20),
  status ENUM('pending','approved','rejected','rescheduled','completed') DEFAULT 'pending',
  reason TEXT,
  phone_number VARCHAR(30),
  is_urgent TINYINT(1) DEFAULT 0,
  counselor_action_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  INDEX idx_appointment_referral (referral_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  status ENUM('read','unread') DEFAULT 'unread',
  link VARCHAR(255),
  type VARCHAR(30) DEFAULT 'info',
  image_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(512),
  date_posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS test_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointment_id INT NULL,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  test_name VARCHAR(120) NOT NULL,
  completed_date DATE NOT NULL,
  summary TEXT,
  recommendations TEXT,
  result_file_url VARCHAR(255) NULL,
  result_file_name VARCHAR(255) NULL,
  result_file_type VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  content TEXT NOT NULL,
  status ENUM('read','unread') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS student_inventories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  counselor_id INT NULL,
  form_data JSON,
  scan_url VARCHAR(255),
  scan_filename VARCHAR(255),
  scan_filetype VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_consents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  e_consent_signed_at TIMESTAMP NULL,
  e_consent_typed_name VARCHAR(120),
  e_consent_ip VARCHAR(45),
  scan_url VARCHAR(255),
  scan_filename VARCHAR(255),
  scan_filetype VARCHAR(100),
  uploaded_by INT NULL,
  uploaded_at TIMESTAMP NULL,
  scope TEXT,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS counseling_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  appointment_id INT NULL,
  session_date DATE NOT NULL,
  presenting_concern TEXT,
  goals TEXT,
  summary TEXT,
  plan TEXT,
  comments TEXT,
  next_session ENUM('followup','termination') DEFAULT 'followup',
  counselor_signature VARCHAR(120),
  form_data JSON,
  finalized_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_session_student (student_id),
  INDEX idx_session_counselor (counselor_id),
  INDEX idx_session_date (session_date),
  INDEX idx_session_finalized (student_id, finalized_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  actor_id INT NULL,
  actor_role VARCHAR(30),
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40),
  target_id INT NULL,
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_action (action),
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_created (created_at)
);

CREATE TABLE IF NOT EXISTS referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  referrer_id INT NOT NULL,
  receiving_counselor_id INT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status ENUM('pending','accepted','rejected','rescheduled','cancelled') DEFAULT 'pending',
  decision_note TEXT,
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (receiving_counselor_id) REFERENCES users(id),
  INDEX idx_referral_receiver (receiving_counselor_id, status),
  INDEX idx_referral_referrer (referrer_id, status),
  INDEX idx_referral_student (student_id)
);

-- Forward FK: appointments.referral_id -> referrals.id. Declared here because
-- the referrals table is defined after appointments. Guarded so re-runs are
-- a no-op (CREATE TABLE IF NOT EXISTS does not idempotently add constraints).
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'appointments'
    AND COLUMN_NAME = 'referral_id'
    AND REFERENCED_TABLE_NAME = 'referrals'
);
SET @add_fk := IF(@has_fk = 0,
  'ALTER TABLE appointments ADD CONSTRAINT fk_appointments_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @add_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS report_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id INT NOT NULL,
  counselor_id INT NOT NULL,
  request_type ENUM('individual','college','department') NOT NULL DEFAULT 'individual',
  student_name VARCHAR(255),
  student_identifier VARCHAR(100),
  department VARCHAR(120),
  reason TEXT NOT NULL,
  status ENUM('pending','fulfilled','declined','cancelled') DEFAULT 'pending',
  response_note TEXT,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  INDEX idx_report_request_counselor (counselor_id, status),
  INDEX idx_report_request_requester (requester_id, status)
);

CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  appointment_id INT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_feedback_counselor (counselor_id, created_at),
  INDEX idx_feedback_student (student_id, created_at),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS client_feedback_forms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  appointment_id INT NULL,
  responses JSON NOT NULL,
  overall_satisfaction TINYINT NOT NULL,
  would_recommend ENUM('yes','no','not_sure') NOT NULL,
  rating TINYINT NULL,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_cff_counselor (counselor_id, created_at),
  INDEX idx_cff_student (student_id, created_at),
  UNIQUE KEY uq_cff_student_counselor (student_id, counselor_id)
);

CREATE TABLE IF NOT EXISTS report_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  report_payload JSON NOT NULL,
  status ENUM('sent','acknowledged') DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  INDEX idx_report_recipient (recipient_id, status),
  INDEX idx_report_sender (sender_id, sent_at)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  otp_code VARCHAR(8) NULL,
  otp_verified_at DATETIME NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_token (token_hash),
  INDEX idx_pwreset_user (user_id, used_at),
  INDEX idx_pwreset_email_lookup (user_id, used_at, expires_at)
);

-- Signup email-mailbox verification. Keyed by email (no user row exists yet at
-- verify time): a student must confirm an emailed 6-digit code before their
-- registration is accepted, proving they control the MSU email they gave.
CREATE TABLE IF NOT EXISTS email_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(120) NOT NULL,
  otp_code VARCHAR(8) NULL,
  otp_attempts INT NOT NULL DEFAULT 0,
  verified_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_emailverif_lookup (email, consumed_at, expires_at)
);

-- Whether the student allows a referral session's report to be shared with
-- the referring College Representative. Separate from the primary informed
-- consent (student_consents.e_consent_signed_at) — this is decided per
-- student, any time after the primary consent is on file. Guarded so re-runs
-- of this file are a no-op.
SET @has_referral_sharing_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_consents'
    AND COLUMN_NAME = 'referral_sharing_consent'
);
SET @add_referral_sharing_col := IF(@has_referral_sharing_col = 0,
  "ALTER TABLE student_consents ADD COLUMN referral_sharing_consent ENUM('yes','no') NULL, ADD COLUMN referral_sharing_decided_at TIMESTAMP NULL",
  'SELECT 1');
PREPARE stmt FROM @add_referral_sharing_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ties a report_requests row to the actual student record (needed to
-- automatically resolve individual requests against referrals + consent,
-- instead of matching on free-text student_name).
SET @has_report_request_student_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'report_requests'
    AND COLUMN_NAME = 'student_id'
);
SET @add_report_request_student_col := IF(@has_report_request_student_col = 0,
  'ALTER TABLE report_requests ADD COLUMN student_id INT NULL, ADD CONSTRAINT fk_report_requests_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @add_report_request_student_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- When a registration was approved, separate from updated_at (which also
-- changes on unrelated profile edits) so admin stats like "approved this
-- week" stay accurate after later edits.
SET @has_approved_at_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'approved_at'
);
SET @add_approved_at_col := IF(@has_approved_at_col = 0,
  'ALTER TABLE users ADD COLUMN approved_at TIMESTAMP NULL',
  'SELECT 1');
PREPARE stmt FROM @add_approved_at_col; EXECUTE stmt; DEALLOCATE PREPARE stmt;
