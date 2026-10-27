import { query } from "@/lib/db/query";
import type {
  ActivityAction,
  ActivityChanges,
  ActivityEntityType,
  ActivityLog,
} from "@/types/activity";

/** Append-only: this file only has INSERT and SELECT on purpose. */

export async function insertActivityLog(input: {
  actorId: string;
  actorEmail: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string | null;
  entityLabel: string | null;
  changes: ActivityChanges | null;
}): Promise<void> {
  await query(
    `INSERT INTO activity_logs
       (actor_id, actor_email, action, entity_type, entity_id, entity_label, changes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.actorId,
      input.actorEmail,
      input.action,
      input.entityType,
      input.entityId,
      input.entityLabel,
      input.changes ? JSON.stringify(input.changes) : null,
    ]
  );
}

export async function listActivityPage(input: {
  entityType?: string;
  entityId?: string;
  actorEmail?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ActivityLog[]; total: number }> {
  const offset = (input.page - 1) * input.pageSize;
  const params = [
    input.entityType || null,
    input.entityId || null,
    input.actorEmail || null,
  ];

  const where = `
    WHERE ($1::text IS NULL OR entity_type = $1)
      AND ($2::uuid IS NULL OR entity_id = $2)
      AND ($3::text IS NULL OR actor_email = $3)
  `;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM activity_logs ${where}`,
    params
  );

  const result = await query<ActivityLog>(
    `SELECT id, actor_id, actor_email, action, entity_type, entity_id,
            entity_label, changes, created_at
     FROM activity_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $4 OFFSET $5`,
    [...params, input.pageSize, offset]
  );

  return {
    items: result.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

/** Emails that appear in the log, for the "who" filter. */
export async function listActivityActorEmails(): Promise<string[]> {
  const result = await query<{ actor_email: string }>(
    `SELECT DISTINCT actor_email FROM activity_logs ORDER BY actor_email ASC`
  );
  return result.rows.map((row) => row.actor_email);
}
