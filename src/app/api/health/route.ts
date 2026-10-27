import { NextResponse } from "next/server";
import { query } from "@/lib/db/query";
import { countUsers } from "@/db/queries/users.queries";

/**
 * GET /api/health
 * Learning checkpoint: App → pg → PostgreSQL connected hai ya nahi?
 */
export async function GET() {
  try {
    const dbPing = await query<{ ok: number }>("SELECT 1 AS ok");
    const usersCount = await countUsers();

    return NextResponse.json({
      status: "ok",
      database: dbPing.rows[0]?.ok === 1 ? "connected" : "unknown",
      users_count: usersCount,
      module: "Module 2 — Foundation (raw pg)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message,
        hint: "Check DATABASE_URL in .env and run: npm run db:migrate",
      },
      { status: 500 }
    );
  }
}
