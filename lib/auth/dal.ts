import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionExpiry,
  writeSessionCookie,
} from "./session";
import {
  clearTokens,
  readTokens,
  signOutUpstream,
  verifyAccessToken,
} from "./supabase-session";

/**
 * The data access layer. Every authenticated read goes through here so the
 * session check can never be forgotten at a call site — including in Server
 * Actions, which are reachable by direct POST and are not protected by routing.
 */

export type Role = (typeof s.memberRoleEnum.enumValues)[number];

export interface CurrentMember {
  id: string;
  phone: string;
  name: string;
  role: Role;
  areaSlug: string | null;
  homeHubId: string | null;
  supplierId: string | null;
  creditKobo: number;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  notifyPoolOpen: boolean;
}

const MEMBER_COLUMNS = {
  id: s.members.id,
  phone: s.members.phone,
  name: s.members.name,
  role: s.members.role,
  areaSlug: s.members.areaSlug,
  homeHubId: s.members.homeHubId,
  supplierId: s.members.supplierId,
  creditKobo: s.members.creditKobo,
  notifyWhatsapp: s.members.notifyWhatsapp,
  notifySms: s.members.notifySms,
  notifyPoolOpen: s.members.notifyPoolOpen,
  isBlocked: s.members.isBlocked,
} as const;

/**
 * Resolves the signed-in member, or null. Memoised per render pass so a page
 * that checks auth in five components still makes one query.
 *
 * Two session types are accepted. A Supabase Auth access token is preferred;
 * the app's own cookie is the fallback and exists only while the Supabase
 * project has phone sign-in switched off. Once phone auth is enabled the
 * legacy branch stops being reachable and can be deleted.
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const fromSupabase = await getMemberFromSupabase();
  if (fromSupabase) return fromSupabase;
  return getMemberFromLegacySession();
});

/** Supabase Auth: verify the access token, then find the linked member row. */
async function getMemberFromSupabase(): Promise<CurrentMember | null> {
  const { access } = await readTokens();
  const claims = await verifyAccessToken(access);
  if (!claims) return null;

  const db = await getDb();
  const [row] = await db
    .select(MEMBER_COLUMNS)
    .from(s.members)
    .where(eq(s.members.authUserId, claims.sub))
    .limit(1);

  if (!row || row.isBlocked) return null;

  const { isBlocked, ...member } = row;
  void isBlocked;
  return member;
}

async function getMemberFromLegacySession(): Promise<CurrentMember | null> {
  const payload = await readSessionCookie();
  if (!payload) return null;

  const db = await getDb();
  const [row] = await db
    .select({
      id: s.members.id,
      phone: s.members.phone,
      name: s.members.name,
      role: s.members.role,
      areaSlug: s.members.areaSlug,
      homeHubId: s.members.homeHubId,
      supplierId: s.members.supplierId,
      creditKobo: s.members.creditKobo,
      notifyWhatsapp: s.members.notifyWhatsapp,
      notifySms: s.members.notifySms,
      notifyPoolOpen: s.members.notifyPoolOpen,
      isBlocked: s.members.isBlocked,
    })
    .from(s.members)
    .innerJoin(s.sessions, eq(s.sessions.memberId, s.members.id))
    .where(
      and(
        eq(s.sessions.id, payload.sessionId),
        eq(s.members.id, payload.memberId),
        isNull(s.sessions.revokedAt),
        gt(s.sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row || row.isBlocked) return null;

  const { isBlocked, ...member } = row;
  void isBlocked;
  return member;
}

/**
 * Finds or creates the member row behind a Supabase auth user, and links them.
 *
 * A member may already exist from a coordinator adding their phone number
 * before they ever signed in, so match on phone first and adopt that row
 * rather than creating a duplicate.
 */
export async function linkAuthUser(input: {
  authUserId: string;
  phone: string;
}): Promise<{ memberId: string; isNewMember: boolean }> {
  const db = await getDb();
  const now = new Date();

  const [linked] = await db
    .select({ id: s.members.id })
    .from(s.members)
    .where(eq(s.members.authUserId, input.authUserId))
    .limit(1);

  if (linked) {
    await db.update(s.members).set({ lastSeenAt: now }).where(eq(s.members.id, linked.id));
    return { memberId: linked.id, isNewMember: false };
  }

  const [byPhone] = await db
    .select({ id: s.members.id, name: s.members.name })
    .from(s.members)
    .where(eq(s.members.phone, input.phone))
    .limit(1);

  if (byPhone) {
    await db
      .update(s.members)
      .set({ authUserId: input.authUserId, lastSeenAt: now })
      .where(eq(s.members.id, byPhone.id));
    // Someone added by a coordinator has a row but has never named themselves.
    return { memberId: byPhone.id, isNewMember: byPhone.name.trim().length === 0 };
  }

  const [created] = await db
    .insert(s.members)
    .values({
      authUserId: input.authUserId,
      phone: input.phone,
      name: "",
      areaSlug: "abuja",
      lastSeenAt: now,
    })
    .returning({ id: s.members.id });

  return { memberId: created.id, isNewMember: true };
}

/** Redirects to sign-in when there is no session. Use in pages and actions. */
export async function requireMember(returnTo?: string): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) {
    redirect(returnTo ? `/join?next=${encodeURIComponent(returnTo)}` : "/join");
  }
  return member;
}

/** Ops and admin can reach every back-office surface. */
export function hasRole(member: CurrentMember, ...roles: Role[]): boolean {
  if (member.role === "admin" || member.role === "ops") return true;
  return roles.includes(member.role);
}

export async function requireRole(...roles: Role[]): Promise<CurrentMember> {
  const member = await requireMember();
  if (!hasRole(member, ...roles)) redirect("/my-pools");
  return member;
}

/** Strictly ops or admin — used by the back office, which has no soft edges. */
export async function requireOps(): Promise<CurrentMember> {
  const member = await requireMember();
  if (member.role !== "ops" && member.role !== "admin") redirect("/my-pools");
  return member;
}

/* ---------------------------------------------------------------------- */
/* Session lifecycle                                                       */
/* ---------------------------------------------------------------------- */

export async function startSession(memberId: string, userAgent?: string): Promise<void> {
  const db = await getDb();
  const expiresAt = sessionExpiry();

  const [session] = await db
    .insert(s.sessions)
    .values({ memberId, userAgent, expiresAt })
    .returning({ id: s.sessions.id });

  await writeSessionCookie({ sessionId: session.id, memberId }, expiresAt);
}

/** Ends whichever session type the caller has, and both if they have both. */
export async function endSession(): Promise<void> {
  const { access } = await readTokens();
  if (access) {
    await signOutUpstream(access);
    await clearTokens();
  }

  const payload = await readSessionCookie();
  if (payload) {
    const db = await getDb();
    await db
      .update(s.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(s.sessions.id, payload.sessionId));
    await clearSessionCookie();
  }
}
