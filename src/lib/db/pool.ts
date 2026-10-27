import { Pool } from "pg";

/**
 * Next.js hot-reload har save pe naya Pool bana sakta hai.
 * Development mein globalThis pe cache karte hain taaki
 * PostgreSQL connections exhaust na ho jayein.
 */
const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL missing. Copy .env.example to .env and set your Postgres URL."
    );
  }

  return new Pool({
    connectionString,
    // Local learning defaults — production mein tune karenge
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}
