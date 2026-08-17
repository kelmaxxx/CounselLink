import { query } from "../config/db.js";

async function main() {
  try {
    const users = await query(
      "SELECT id, name, email, role, student_id, first_name, last_name FROM users WHERE name LIKE '%abdensa%' OR name LIKE '%macatanong%' OR email LIKE '%abdensa%' OR first_name LIKE '%abdensa%' OR last_name LIKE '%macatanong%'"
    );
    console.log("MATCHING USERS:", JSON.stringify(users, null, 2));

    for (const u of users) {
      const id = u.id;
      const appts = await query("SELECT COUNT(*) as count FROM appointments WHERE student_id = ? OR counselor_id = ?", [id, id]);
      const tests = await query("SELECT COUNT(*) as count FROM test_results WHERE student_id = ? OR counselor_id = ?", [id, id]);
      const msgs = await query("SELECT COUNT(*) as count FROM messages WHERE sender_id = ? OR recipient_id = ?", [id, id]);
      const notes = await query("SELECT COUNT(*) as count FROM notifications WHERE user_id = ?", [id]);
      const invs = await query("SELECT COUNT(*) as count FROM individual_inventory WHERE student_id = ?", [id]);
      const cons = await query("SELECT COUNT(*) as count FROM informed_consent WHERE student_id = ?", [id]);
      const reqs = await query("SELECT COUNT(*) as count FROM report_requests WHERE requester_id = ? OR counselor_id = ?", [id, id]);
      const recs = await query("SELECT COUNT(*) as count FROM report_recipients WHERE sender_id = ? OR recipient_id = ?", [id, id]);
      const sess = await query("SELECT COUNT(*) as count FROM counseling_sessions WHERE student_id = ? OR counselor_id = ?", [id, id]);
      console.log(`RECORDS FOR USER ${id} (${u.name}):`, {
        appointments: appts[0].count,
        test_results: tests[0].count,
        messages: msgs[0].count,
        notifications: notes[0].count,
        individual_inventory: invs[0]?.count || 0,
        informed_consent: cons[0]?.count || 0,
        report_requests: reqs[0]?.count || 0,
        report_recipients: recs[0]?.count || 0,
        counseling_sessions: sess[0]?.count || 0,
      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

main();
