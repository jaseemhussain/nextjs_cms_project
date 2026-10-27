import {
  insertActivityLog,
  listActivityActorEmails,
  listActivityPage,
} from "@/db/queries/activity.queries";
import type {
  ActivityAction,
  ActivityActor,
  ActivityChanges,
  ActivityEntityType,
  ActivityLog,
} from "@/types/activity";
import type { PaginationMeta } from "@/types/pagination";

const MAX_VALUE_LENGTH = 120;

/**
 * Call this inside withTransaction() together with the action,
 * so the action and its log are saved together or not at all.
 */
export async function logActivity(
  actor: ActivityActor,
  entry: {
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId: string | null;
    entityLabel: string | null;
    changes?: ActivityChanges | null;
  }
): Promise<void> {
  await insertActivityLog({
    actorId: actor.id,
    actorEmail: actor.email,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel,
    changes: entry.changes ?? null,
  });
}

/** Long text (e.g. post body) is shortened so logs stay small and readable. */
function shorten(value: unknown): unknown {
  if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
    return `${value.slice(0, MAX_VALUE_LENGTH)}…`;
  }
  return value;
}

function normalize(value: unknown): unknown {
  if (value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? [...value].sort() : null;
  return value;
}

/**
 * Compares the listed fields and returns only the ones that changed,
 * or null when nothing changed (so a "Save" with no edits creates no log).
 */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): ActivityChanges | null {
  const changes: ActivityChanges = {};

  for (const field of fields) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from: shorten(from), to: shorten(to) };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

export async function getActivityPage(options: {
  entityType?: string;
  entityId?: string;
  actorEmail?: string;
  page?: number;
  pageSize?: number;
}): Promise<
  { items: ActivityLog[]; actorEmails: string[] } & PaginationMeta
> {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 20));
  const entityId =
    options.entityId && /^[0-9a-f-]{36}$/i.test(options.entityId)
      ? options.entityId
      : undefined;

  const [result, actorEmails] = await Promise.all([
    listActivityPage({
      entityType: options.entityType,
      entityId,
      actorEmail: options.actorEmail,
      page,
      pageSize,
    }),
    listActivityActorEmails(),
  ]);

  return {
    items: result.items,
    actorEmails,
    page,
    pageSize,
    total: result.total,
    totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize),
  };
}
