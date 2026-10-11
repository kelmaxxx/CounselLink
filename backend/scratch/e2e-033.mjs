import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const BASE = "http://localhost:5000";
const db = await mysql.createConnection({
  host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, port: Number(process.env.DB_PORT || 3306),
  ssl: process.env.DB_SSL === "true" ? (process.env.DB_CA_PATH ? { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true } : { rejectUnauthorized: false }) : undefined,
});
const q = async (sql, p) => (await db.query(sql, p))[0];

const fail = (m) => { console.error("FAIL: " + m); process.exitCode = 1; };
const ok = (m) => console.log("ok: " + m);

// pick an approved rep + counselor
const [reps] = await q("SELECT id, name, college FROM users WHERE role='college_rep' AND status='approved' LIMIT 1");
const [couns] = await q("SELECT id, name FROM users WHERE role='counselor' AND status='approved' LIMIT 1");
if (!reps || !couns) { console.error("need 1 rep + 1 counselor in DB"); process.exit(1); }
const rep = reps, coun = couns;
// give the rep a saved signature for this test (restore afterwards)
const [prevSig] = await q("SELECT signature_url FROM users WHERE id=?", [rep.id]);
await q("UPDATE users SET signature_url='/uploads/signatures/test-rep.png' WHERE id=?", [rep.id]);

const repTok = jwt.sign({ id: rep.id, role: "college_rep", name: rep.name, college: rep.college }, process.env.JWT_SECRET, { expiresIn: "10m" });
const counTok = jwt.sign({ id: coun.id, role: "counselor", name: coun.name }, process.env.JWT_SECRET, { expiresIn: "10m" });
const H = (t) => ({ "Content-Type": "application/json", Authorization: "Bearer " + t });

// 1. create a college-type letter request
let res = await fetch(BASE + "/api/report-requests", { method: "POST", headers: H(repTok),
  body: JSON.stringify({ requestType: "college", reason: "E2E accreditation test letter" }) });
let body = await res.json();
if (res.status !== 201) { fail("create college request: " + res.status + " " + JSON.stringify(body)); process.exit(1); }
ok("created request id=" + body.id);
const reqId = body.id;

// 2. snapshot persisted?
const [rows] = await q("SELECT letter_snapshot, rep_signature_url FROM report_requests WHERE id=?", [reqId]);
const snap = typeof rows.letter_snapshot === "string" ? JSON.parse(rows.letter_snapshot) : rows.letter_snapshot;
if (snap?.subject !== "Request for College Counseling Data") fail("snapshot subject: " + JSON.stringify(snap?.subject));
else ok("snapshot subject frozen");
if (rows.rep_signature_url !== "/uploads/signatures/test-rep.png") fail("rep signature stored");
else ok("rep signature stored on request");
if (snap?.requesterCollege !== rep.college) fail("snapshot college: " + snap?.requesterCollege);
else ok("snapshot college = " + rep.college);

// 3. list exposes new letter fields
res = await fetch(BASE + "/api/report-requests", { headers: H(repTok) });
body = await res.json();
const mine = (Array.isArray(body) ? body : []).find((r) => r.id === reqId);
if (!mine?.letter_snapshot || !mine?.rep_signature_url) fail("list missing letter fields");
else ok("list exposes letter_snapshot + rep_signature_url");

// 4. single-letter endpoint (+ new consent cols)
res = await fetch(BASE + "/api/report-requests/" + reqId, { headers: H(repTok) });
body = await res.json();
if (res.status !== 200 || !body.letter_snapshot) fail("GET /:id letter: " + res.status);
else ok("GET /:id returns letter (+studentConsent=" + body.studentConsent + ", hasFinalizedSession=" + body.hasFinalizedSession + ")");

// 5. counselor declines with remarks (FOR DSA USE ONLY)
res = await fetch(BASE + "/api/report-requests/" + reqId + "/respond", { method: "PUT", headers: H(counTok),
  body: JSON.stringify({ status: "declined", responseNote: "E2E test remarks" }) });
body = await res.json();
if (res.status !== 200) fail("counselor respond: " + res.status + " " + JSON.stringify(body));
else ok("counselor declined with remarks");

// 6. filed letter now carries remarks + counselor block
res = await fetch(BASE + "/api/report-requests/" + reqId, { headers: H(repTok) });
body = await res.json();
if (body.status !== "declined" || body.response_note !== "E2E test remarks" || body.counselorName !== coun.name) {
  fail("filed letter missing remarks/counselor: " + JSON.stringify({ s: body.status, n: body.response_note, c: body.counselorName }));
} else ok("filed letter shows remarks + deciding counselor");

// 7. individual request without rep signature is rejected
await q("UPDATE users SET signature_url=NULL WHERE id=?", [rep.id]);
res = await fetch(BASE + "/api/report-requests", { method: "POST", headers: H(repTok),
  body: JSON.stringify({ requestType: "college", reason: "should fail" }) });
if (res.status !== 400) fail("missing-signature guard: got " + res.status);
else ok("request blocked until rep draws signature");

// cleanup
await q("DELETE FROM notifications WHERE user_id=? AND link='/counselor/reports'", [coun.id]);
await q("DELETE FROM report_requests WHERE id=?", [reqId]);
await q("UPDATE users SET signature_url=? WHERE id=?", [prevSig.signature_url, rep.id]);
await db.end();
console.log("e2e done for request " + reqId);
