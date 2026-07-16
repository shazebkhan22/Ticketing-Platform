import bcrypt from "bcrypt";
import { pool } from "./pool";

interface SeedUser {
  username: string;
  password: string;
  role: "admin" | "employee";
  displayName: string;
  email: string | null;
}
const PLACEHOLDER_PASSWORD = "Cygnus@123";
const SEED_USERS: SeedUser[] = [
  { username: "parmanand", password: PLACEHOLDER_PASSWORD, role: "admin", displayName: "Parmanand Pandey", email: "parmanandp@cygnussolutions.co.in" },
  { username: "jitesh", password: PLACEHOLDER_PASSWORD, role: "admin", displayName: "Jitesh Malhotra", email: "jiteshm@cygnussolutions.co.in" },
  { username: "helpdesk", password: PLACEHOLDER_PASSWORD, role: "admin", displayName: "Help Desk", email: null },
  { username: "pranesh", password: PLACEHOLDER_PASSWORD, role: "employee", displayName: "Pranesh Kute", email: "praneshk@cygnussolutions.co.in" },
  { username: "raghavendra", password: PLACEHOLDER_PASSWORD, role: "employee", displayName: "Raghavendra Mishra", email: "raghavendram@cygnussolutions.co.in" },
  { username: "manoj", password: PLACEHOLDER_PASSWORD, role: "employee", displayName: "Manoj Mohite", email: "manojm@cygnussolutions.co.in" },
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
          `INSERT INTO users (username, password_hash, role, display_name, email) VALUES ($1, $2, $3, $4, $5)`,
          [user.username, hash, user.role, user.displayName, user.email]
        );
        console.log(`User "${user.username}" (${user.role}) created.`);
      } else {
        await client.query(
          `UPDATE users SET role = $1, email = $2 WHERE username = $3`,
          [user.role, user.email, user.username]
        );
        console.log(`User "${user.username}" already exists, role/email synced.`);
      }
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
