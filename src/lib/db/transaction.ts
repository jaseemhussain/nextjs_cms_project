import { AsyncLocalStorage } from "node:async_hooks";
import type { PoolClient } from "pg";
import { pool } from "./pool";

/**
 * Holds the client of the transaction currently running in this async call chain.
 * `query()` reads it, so every existing query function joins the transaction
 * automatically — no need to pass a client through every function.
 */
export const transactionStorage = new AsyncLocalStorage<PoolClient>();

/**
 * Runs `fn` inside BEGIN … COMMIT. Any error → ROLLBACK, and the error is re-thrown.
 * Nested calls join the outer transaction instead of opening a new one.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (transactionStorage.getStore()) {
    return fn();
  }

  // A transaction must use ONE connection; pool.query could pick a different one per query.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await transactionStorage.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
