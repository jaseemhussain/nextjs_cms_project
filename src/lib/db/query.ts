import type { QueryResult, QueryResultRow } from "pg";
import { pool } from "./pool";
import { transactionStorage } from "./transaction";

/**
 * Thin wrapper around pool.query.
 * Har query yahan se jaaye — logging / metrics baad mein ek jagah add kar sakte ho.
 * Inside withTransaction() it uses the transaction's client instead of the pool.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = transactionStorage.getStore();
  if (client) {
    return client.query<T>(text, params);
  }
  return pool.query<T>(text, params);
}
