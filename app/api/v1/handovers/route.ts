import { createSupabaseContext } from "@supabase/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { recordHandover } from "@/lib/domain/commitments";
import { recordAudit } from "@/lib/domain/ops";

/**
 * Offline handover sync for the hub agent tool.
 *
 * The hub screen tells the agent it is "recording offline" and will sync when
 * the connection returns. This is where that queue lands.
 *
 * Authenticated with a Supabase bearer token rather than the session cookie,
 * because the caller here is a background sync from a phone that may have been
 * offline for hours, not a page navigation. `createSupabaseContext` verifies
 * the token against the project's JWKS before the handler runs.
 *
 * Writes are idempotent: `recordHandover` ignores a commitment that already
 * has one, so replaying the whole queue after a partial sync is safe.
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  handovers: z
    .array(
      z.object({
        commitmentId: z.string().uuid(),
        weightGrams: z.number().int().positive().optional(),
        notes: z.string().trim().max(500).optional(),
        /** When the agent actually handed it over, not when it synced. */
        handedOverAt: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(request: Request) {
  const { data: ctx, error } = await createSupabaseContext(request, { auth: "user" });

  if (error || !ctx?.userClaims) {
    return Response.json({ error: "Sign in to sync." }, { status: error?.status ?? 401 });
  }

  const authUserId = ctx.jwtClaims?.sub;
  if (!authUserId) return Response.json({ error: "Malformed token." }, { status: 401 });

  const db = await getDb();
  const [agent] = await db
    .select({ id: s.members.id, role: s.members.role, homeHubId: s.members.homeHubId })
    .from(s.members)
    .where(eq(s.members.authUserId, authUserId))
    .limit(1);

  if (!agent) return Response.json({ error: "No member for this account." }, { status: 403 });

  // A verified token proves who you are, not what you may do.
  const permitted = agent.role === "hub_agent" || agent.role === "ops" || agent.role === "admin";
  if (!permitted || !agent.homeHubId) {
    return Response.json({ error: "Not a hub agent." }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Malformed sync payload." }, { status: 400 });
  }

  const synced: string[] = [];
  const rejected: { commitmentId: string; reason: string }[] = [];

  for (const h of body.handovers) {
    // Only commitments collecting at this agent's own hub.
    const [row] = await db
      .select({ hubId: s.pools.hubId })
      .from(s.commitments)
      .innerJoin(s.pools, eq(s.pools.id, s.commitments.poolId))
      .where(eq(s.commitments.id, h.commitmentId))
      .limit(1);

    if (!row) {
      rejected.push({ commitmentId: h.commitmentId, reason: "unknown commitment" });
      continue;
    }
    if (row.hubId !== agent.homeHubId) {
      rejected.push({ commitmentId: h.commitmentId, reason: "different hub" });
      continue;
    }

    await recordHandover({
      commitmentId: h.commitmentId,
      hubId: row.hubId,
      agentId: agent.id,
      weightGrams: h.weightGrams ?? null,
      notes: h.notes ?? null,
      handedOverAt: h.handedOverAt ? new Date(h.handedOverAt) : undefined,
      capturedOffline: true,
    });
    synced.push(h.commitmentId);
  }

  await recordAudit({
    actorId: agent.id,
    actorLabel: "Hub agent sync",
    action: "handover.synced",
    subject: agent.homeHubId,
    detail: { synced: synced.length, rejected: rejected.length },
  });

  return Response.json({ synced, rejected });
}
