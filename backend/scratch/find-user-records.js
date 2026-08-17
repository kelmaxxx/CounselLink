import { query } from "../config/db.js";

async function main() {
  try {
    const tables = await query("SHOW TABLES");
    console.log("TABLES:", tables);

    const userId = 473; // Abdensa C. Macatanong
    const user = await query("SELECT * FROM users WHERE id = ?", [userId]);
    console.log("USER 473:", user[0]);

    for (const tRow of tables) {
      const tableName = Object.values(tRow)[0];
      const cols = await query(`SHOW COLUMNS FROM \`${tableName}\``);
      const colNames = cols.map(c => c.Field);
      
      const userCols = colNames.filter(c => c.includes("user") || c.includes("student") || c.includes("counselor") || c.includes("sender") || c.includes("recipient") || c.includes("requester"));
      
      if (userCols.length > 0) {
        const whereClauses = userCols.map(c => `\`${c}\` = ?`).join(" OR ");
        const params = userCols.map(() => userId);
        const rows = await query(`SELECT COUNT(*) as cnt FROM \`${tableName}\` WHERE ${whereClauses}`, params);
        if (rows[0].cnt > 0) {
          console.log(`Found ${rows[0].cnt} rows in table \`${tableName}\` matching user ${userId} in columns:`, userCols);
        }
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

main();
