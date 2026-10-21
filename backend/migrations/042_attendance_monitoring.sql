-- Migration 042: Attendance and cancellation monitoring.
-- Missed appointments are recorded only when a counselor/admin explicitly
-- marks them (no time-based auto sweep). Canceled appointments are kept as
-- rows instead of being deleted so cancellation streaks are auditable.

USE counselink;

ALTER TABLE appointments
  MODIFY COLUMN status ENUM('pending','approved','rejected','rescheduled','completed','no_show','missed','canceled') DEFAULT 'pending',
  ADD COLUMN canceled_by INT NULL,
  ADD COLUMN canceled_at TIMESTAMP NULL,
  ADD COLUMN outcome_marked_by INT NULL,
  ADD COLUMN outcome_marked_at TIMESTAMP NULL,
  ADD INDEX idx_appointment_student_status (student_id, status);

CREATE TABLE IF NOT EXISTS student_warnings (
  id                    INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id            INT          NOT NULL,
  type                  ENUM('missed_streak','repeated_cancellation') NOT NULL,
  reason                VARCHAR(255) NOT NULL,
  event_count           INT          NOT NULL,
  trigger_appointment_id INT         NULL,
  status                ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  review_note           TEXT         NULL,
  reviewed_by           INT          NULL,
  reviewed_at           TIMESTAMP    NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_warning_trigger (type, trigger_appointment_id),
  CONSTRAINT fk_warning_student  FOREIGN KEY (student_id)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_warning_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key   VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_by    INT          NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('cancellation_warning_threshold', '4')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
