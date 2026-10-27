import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

/**
 * Simple migration runner (learning version).
 * SQL files apply hote hain order mein; schema_migrations track karti hai kya chal chuka hai.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL missing. Copy .env.example → .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const migrationsDir = path.join(process.cwd(), "sql", "migrations");

  try {
    // 1) Tracking table pehle
    const bootstrap = fs.readFileSync(
      path.join(migrationsDir, "000_schema_migrations.sql"),
      "utf8"
    );
    await pool.query(bootstrap);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const check = await pool.query(
        `SELECT 1 FROM schema_migrations WHERE filename = $1`,
        [file]
      );

      if ((check.rowCount ?? 0) > 0) {
        console.log(`skip  ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`apply ${file}`);

      await pool.query("BEGIN");
      try {
        // 000 already applied above; sirf record karo. Baaki files ka SQL chalao.
        if (file !== "000_schema_migrations.sql") {
          await pool.query(sql);
        }

        await pool.query(
          `INSERT INTO schema_migrations (filename) VALUES ($1)`,
          [file]
        );
        await pool.query("COMMIT");
        console.log(`ok    ${file}`);
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
    }

    console.log("\nMigrations complete.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
