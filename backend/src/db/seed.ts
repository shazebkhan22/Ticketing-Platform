import bcrypt from "bcrypt";
import { pool } from "./pool";

interface SeedUser {
  username: string;
  password: string;
  role: "admin" | "employee";
  displayName: string;
}

// IMPORTANT: replace every password below with a real one of your own choosing
// BEFORE running `npm run seed` for the first time — never commit real
// passwords here, this file is tracked in git. Re-running seed will NOT
// overwrite an existing user's password — see README for how to change
// credentials later.
const PLACEHOLDER_PASSWORD = "ChangeMe123!";
const SEED_USERS: SeedUser[] = [
  { username: "permanand", password: PLACEHOLDER_PASSWORD, role: "admin", displayName: "Permanand Pandey" },
  { username: "jitesh", password: PLACEHOLDER_PASSWORD, role: "admin", displayName: "Jitesh Malhotra" },
  { username: "helpdesk", password: PLACEHOLDER_PASSWORD, role: "admin", displayName: "Help Desk" },
  { username: "pranesh", password: PLACEHOLDER_PASSWORD, role: "employee", displayName: "Pranesh Kute" },
  { username: "raghvendra", password: PLACEHOLDER_PASSWORD, role: "employee", displayName: "Raghvendra Mishra" },
  { username: "manoj", password: PLACEHOLDER_PASSWORD, role: "employee", displayName: "Manoj Mohite" },
];

const CALL_TYPE_TARGETS: { call_type: string; days: number | null }[] = [
  { call_type: "Warranty", days: 7 },
  { call_type: "AMC", days: 3 },
  { call_type: "OEM", days: null },
  { call_type: "Office", days: null },
  { call_type: "Installation", days: null },
  { call_type: "Project", days: null },
  { call_type: "Call", days: null },
  { call_type: "Chargeable", days: null },
  { call_type: "Non-Chargeable", days: null },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const user of SEED_USERS) {
      const existing = await client.query("SELECT 1 FROM users WHERE username = $1", [
        user.username,
      ]);
      if (existing.rowCount === 0) {
        const hash = await bcrypt.hash(user.password, 12);
        await client.query(
          `INSERT INTO users (username, password_hash, role, display_name) VALUES ($1, $2, $3, $4)`,
          [user.username, hash, user.role, user.displayName]
        );
        console.log(`User "${user.username}" (${user.role}) created.`);
      } else {
        await client.query(`UPDATE users SET role = $1 WHERE username = $2 AND role != $1`, [
          user.role,
          user.username,
        ]);
        console.log(`User "${user.username}" already exists, role synced to "${user.role}".`);
      }
    }

    for (const t of CALL_TYPE_TARGETS) {
      await client.query(
        `INSERT INTO call_type_targets (call_type, target_resolution_days) VALUES ($1, $2)
         ON CONFLICT (call_type) DO NOTHING`,
        [t.call_type, t.days]
      );
    }

    console.log("Seed complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
