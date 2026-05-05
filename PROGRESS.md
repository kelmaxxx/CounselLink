# CounselLink — Defense Sprint Progress

Track milestones from the approved plan. Tick boxes as you finish.

## Week 1 — Fix crashing flows + visible features

- [x] **1.1 Announcements end-to-end** (2026-05-05)
  - [x] `backend/controllers/announcements.controller.js`
  - [x] `backend/routes/announcements.routes.js` mounted in `server.js`
  - [x] `addNotification()` in `NotificationsContext.jsx` posts to `/api/announcements`
  - [x] `CreateAnnouncement.jsx` shows real success/error + recipient count
  - [ ] **MANUAL VERIFY (user):** log in as admin → post announcement → log in as student → notification appears
- [x] **1.2 Profile editing for all 4 roles** (2026-05-05)
  - [x] `backend/controllers/users.controller.js` (getMe, updateMe, adminCreate/Update/Delete, listUsers)
  - [x] `backend/routes/users.routes.js` mounted at `/api/users`
  - [x] `updateProfile()`, `fetchUsers()`, `createUser()`, `updateUser()`, `deleteUser()` in `AuthContext`
  - [x] Schema migration `migrations/001_user_profile_fields.sql` adds bio, department, specialization, employee_id
  - [x] Wired StudentProfile / CounselorProfile / RepProfile / AdminProfile (async + saving state)
  - [x] Fixed `ManageUsers.jsx` create/edit/delete to use real API (removed localStorage path)
  - [ ] **MANUAL VERIFY (user):** run migration → edit profile → log out → log back in → change persisted; admin creates/edits/deletes user
- [x] **1.3 Counselor + rep data scoping fix** (2026-05-05)
  - [x] `appointments.controller.js` — counselor sees own + unassigned; rep sees own college only
  - [x] `tests.controller.js` — added rep college filter (counselor scoping was already correct)
  - [x] `test-results.controller.js` — counselor sees own results only; rep sees own college
  - [ ] **MANUAL VERIFY (user):** counselor only sees assigned/unassigned; rep only sees own college's data

## Week 2 — PDF-spec features
- [x] **2.1 Audit logs end-to-end** (2026-05-05)
  - [x] `audit_logs` table — schema.sql + migration `002_audit_logs.sql`
  - [x] `backend/utils/audit.js` — `logAction(req, action, targetType, targetId, details)`
  - [x] Hooked into: admin approve/reject, user create/update/delete, announcement create, test result upload, appointment accept/reject/reschedule, test accept/reject/reschedule
  - [x] `GET /api/audit-logs` (admin only) with pagination + filter by action/role
  - [x] `GET /api/audit-logs/actions` for dropdown options
  - [x] Frontend `AuditLogs.jsx` page with table, filters, pagination, expandable details
  - [x] Sidebar link + route `/admin/audit-logs`
  - [ ] **MANUAL VERIFY (user):** run migration 002 → perform admin actions → open Audit Logs page → entries appear
- [x] **2.2 Counseling session records archive** (2026-05-06)
  - [x] `counseling_sessions` table — schema.sql + migration `003_counseling_sessions.sql`
  - [x] CRUD endpoints with role scoping (counselor: own; student: own; college_rep: own college; admin: all)
  - [x] Audit log hooks (create/update/delete session)
  - [x] `GET /api/counseling-sessions/by-appointment/:appointmentId` for the per-appointment form
  - [x] Frontend `CounselingSessionsContext` with fetch/create/update/delete
  - [x] Counselor "Manage Students" page rewritten as session-records archive (Records + Overview tabs, search, filter, CSV export)
  - [x] `StudentCounselingForm.jsx` now persists via API (loads existing record by appointmentId or creates new)
  - [x] `/api/users?role=student` accessible to counselors (for the student picker)
  - [ ] **MANUAL VERIFY (user):** run migration 003 → counselor adds/edits/deletes session record on Manage Students page; counselor opens an appointment's "Open Counseling Form", saves → reopens → data still there

## Week 3 — Hardening
- [ ] Backend try/catch + global error middleware
- [ ] Auth on `/api/uploads/cor`
- [ ] `GET /api/users?role=counselor` for triage
- [ ] Session timeout in AuthContext
- [ ] Server-side validation on all create/update bodies
- [ ] DB backup script
- [ ] Empty/error states everywhere

## Week 4 — Defense readiness
- [ ] Walk all 40+ test cases from PDF
- [ ] SUS questionnaire link/embed
- [ ] Seed data script
- [ ] README + ERD + screenshots
- [ ] Demo script (5–10 min)
- [ ] Performance check + DB indexes

---

**Smoke test (run before declaring a week done):**
1. Frontend + backend both start clean
2. Register student → admin approves → student logs in
3. Student requests appointment → counselor accepts → student sees scheduled
4. Counselor fills session form → re-opens → data still there *(W2)*
5. Admin posts announcement → student/counselor receives notification *(W1)* ✅
6. Each role edits profile → re-logs in → change persists *(W1)*
7. Admin opens audit log → sees recent actions *(W2)*
8. No console errors anywhere

**Plan file:** `C:\Users\gampo\.claude\plans\ok-so-lets-continue-snappy-shannon.md`
