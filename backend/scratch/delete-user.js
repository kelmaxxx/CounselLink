import { query, withTransaction } from "../config/db.js";

async function main() {
  const userId = 473; // Abdensa C. Macatanong (student_id: 202334854)

  try {
    const user = await query("SELECT id, name, email, student_id FROM users WHERE id = ?", [userId]);
    if (!user.length) {
      console.log("User 473 not found!");
      process.exit(0);
    }
    console.log("Found user to delete:", user[0]);

    await withTransaction(async (txQuery) => {
      // 1. Delete notifications
      const n = await txQuery("DELETE FROM notifications WHERE user_id = ?", [userId]);
      console.log(`Deleted ${n.affectedRows} notifications`);

      // 2. Delete messages
      const m = await txQuery("DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?", [userId, userId]);
      console.log(`Deleted ${m.affectedRows} messages`);

      // 3. Delete password resets
      const pr = await txQuery("DELETE FROM password_resets WHERE user_id = ?", [userId]);
      console.log(`Deleted ${pr.affectedRows} password resets`);

      // 4. Delete referrals
      const ref = await txQuery("DELETE FROM referrals WHERE student_id = ? OR receiving_counselor_id = ?", [userId, userId]);
      console.log(`Deleted ${ref.affectedRows} referrals`);

      // 5. Delete client feedback forms
      const cf = await txQuery("DELETE FROM client_feedback_forms WHERE student_id = ? OR counselor_id = ?", [userId, userId]);
      console.log(`Deleted ${cf.affectedRows} client feedback forms`);

      // 6. Delete counseling sessions
      const cs = await txQuery("DELETE FROM counseling_sessions WHERE student_id = ? OR counselor_id = ?", [userId, userId]);
      console.log(`Deleted ${cs.affectedRows} counseling sessions`);

      // 7. Delete appointments
      const app = await txQuery("DELETE FROM appointments WHERE student_id = ? OR counselor_id = ?", [userId, userId]);
      console.log(`Deleted ${app.affectedRows} appointments`);

      // 8. Delete student consents
      const sc = await txQuery("DELETE FROM student_consents WHERE student_id = ?", [userId]);
      console.log(`Deleted ${sc.affectedRows} student consents`);

      // 9. Delete student inventories
      const si = await txQuery("DELETE FROM student_inventories WHERE student_id = ? OR counselor_id = ?", [userId, userId]);
      console.log(`Deleted ${si.affectedRows} student inventories`);

      // 10. Delete test results
      const tr = await txQuery("DELETE FROM test_results WHERE student_id = ? OR counselor_id = ?", [userId, userId]);
      console.log(`Deleted ${tr.affectedRows} test results`);

      // 11. Delete user record
      const u = await txQuery("DELETE FROM users WHERE id = ?", [userId]);
      console.log(`Deleted ${u.affectedRows} user record`);
    });

    console.log("SUCCESSFULLY DELETED Abdensa C. Macatanong (ID 473) and all associated records.");
  } catch (err) {
    console.error("TRANSACTION FAILED:", err);
  }
  process.exit(0);
}

main();
