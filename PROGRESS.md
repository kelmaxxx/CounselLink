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
- [ ] **1.3 Counselor data scoping fix** in `appointments.controller.js`

## Week 2 — PDF-spec features
- [ ] **2.1 Audit logs** — `audit_logs` table, `utils/audit.js`, admin viewer page
- [ ] **2.2 Counseling session form persistence** — new `counseling_sessions` table + API

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
