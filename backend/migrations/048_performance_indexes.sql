-- Indexes for the hot list/aggregate queries behind the dashboards and the
-- counseling-session records. Without these, every dashboard load and SSE
-- refresh does a full table scan + filesort on tables that only had FK indexes.

-- Appointment lists/stats/tests: filter by status/type, sort by created_at,
-- count counselor completions, and check queue slot usage on accept.
CREATE INDEX idx_appt_status ON appointments (status);
CREATE INDEX idx_appt_created ON appointments (created_at);
CREATE INDEX idx_appt_counselor_status ON appointments (counselor_id, status);
CREATE INDEX idx_appt_type ON appointments (appointment_type);
CREATE INDEX idx_appt_queue ON appointments (queue_date, queue_slot, queue_number);

-- User directory: role/college filters and ORDER BY name (was a filesort).
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_college ON users (college);
CREATE INDEX idx_users_name ON users (name);
CREATE INDEX idx_users_role_college ON users (role, college);

-- Session history: finalized-only college/report queries, and the common
-- per-student newest-first list.
CREATE INDEX idx_session_finalized_only ON counseling_sessions (finalized_at);
CREATE INDEX idx_session_student_date ON counseling_sessions (student_id, session_date);

-- Conversation threads: both directions of the pairwise lookup + ordering.
CREATE INDEX idx_messages_sender_recipient ON messages (sender_id, recipient_id, created_at);
CREATE INDEX idx_messages_recipient_sender ON messages (recipient_id, sender_id, created_at);

-- Notification feed and received-report list ordering.
CREATE INDEX idx_notif_user_created ON notifications (user_id, created_at);
CREATE INDEX idx_report_recipient_sent ON report_recipients (recipient_id, sent_at);

-- Audit log actor-role filter.
CREATE INDEX idx_audit_actor_role ON audit_logs (actor_role);
