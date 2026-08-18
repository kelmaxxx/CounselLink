import { query } from "../config/db.js";

async function main() {
  try {
    console.log("Updating users status ENUM...");
    await query(`ALTER TABLE users MODIFY COLUMN status ENUM('pending_approval','approved','rejected','banned','pending_setup') DEFAULT 'approved'`);
    console.log("Status ENUM updated.");
  } catch (err) {
    console.log("Status ENUM update note:", err.message);
  }

  try {
    console.log("Creating account_invitations table...");
    await query(`
      CREATE TABLE IF NOT EXISTS account_invitations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_invitation_token (token_hash)
      )
    `);
    console.log("account_invitations table ready.");
  } catch (err) {
    console.error("Failed to create table:", err);
  }
  process.exit(0);
}

main();
