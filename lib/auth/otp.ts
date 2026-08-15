import "server-only";

import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { devMocksAllowed, env } from "../env";
import { getMessenger, messengerIsMock, type Channel } from "../providers/messaging";
import { addMinutes } from "../time";

/**
 * Phone sign-in.
 *
 * The rules the sign-in screen states out loud are the rules enforced here:
 * a six digit code, WhatsApp first with SMS as the fallback channel, a six
 * minute life, and three wrong attempts locking the number for fifteen minutes.
 */

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 6;
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}:${env.sessionSecret}`).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export type RequestOtpResult =
  | { ok: true; channel: Channel; expiresAt: Date; mockCode?: string }
  | { ok: false; error: string; lockedUntil?: Date };

export async function requestOtp(
  phone: string,
  channel: Channel = "whatsapp",
): Promise<RequestOtpResult> {
  const db = await getDb();
  const now = new Date();

  const locked = await isLockedOut(phone, now);
  if (locked) {
    return {
      ok: false,
      error: "Too many wrong codes. Try again in a few minutes.",
      lockedUntil: locked,
    };
  }

  const code = generateCode();
  const expiresAt = addMinutes(now, CODE_TTL_MINUTES);

  await db.insert(s.otpChallenges).values({
    phone,
    codeHash: hashCode(phone, code),
    channel,
    expiresAt,
  });

  const body = `${code} is your BulkieShare code. It expires in ${CODE_TTL_MINUTES} minutes.`;
  const sent = await getMessenger().send({ to: phone, body, channel, code });

  if (!sent.ok) return { ok: false, error: sent.error ?? "Could not send your code." };

  return { ok: true, channel, expiresAt, mockCode: sent.mockCode };
}

/** Returns the time the lockout lifts, or null when the number is not locked. */
async function isLockedOut(phone: string, now: Date): Promise<Date | null> {
  const db = await getDb();
  const [latest] = await db
    .select()
    .from(s.otpChallenges)
    .where(eq(s.otpChallenges.phone, phone))
    .orderBy(desc(s.otpChallenges.createdAt))
    .limit(1);

  if (!latest || latest.attempts < MAX_ATTEMPTS) return null;

  const liftsAt = addMinutes(latest.createdAt, LOCKOUT_MINUTES);
  return liftsAt > now ? liftsAt : null;
}

export type VerifyOtpResult =
  | { ok: true; memberId: string; isNewMember: boolean }
  | { ok: false; error: string; attemptsLeft?: number };

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const db = await getDb();
  const now = new Date();

  if (await isLockedOut(phone, now)) {
    return { ok: false, error: "Too many wrong codes. Try again in a few minutes." };
  }

  const [challenge] = await db
    .select()
    .from(s.otpChallenges)
    .where(
      and(
        eq(s.otpChallenges.phone, phone),
        isNull(s.otpChallenges.consumedAt),
        gt(s.otpChallenges.expiresAt, now),
      ),
    )
    .orderBy(desc(s.otpChallenges.createdAt))
    .limit(1);

  if (!challenge) {
    return { ok: false, error: "That code has expired. Ask for a new one." };
  }

  if (challenge.codeHash !== hashCode(phone, code)) {
    const attempts = challenge.attempts + 1;
    await db
      .update(s.otpChallenges)
      .set({ attempts })
      .where(eq(s.otpChallenges.id, challenge.id));

    const left = MAX_ATTEMPTS - attempts;
    return {
      ok: false,
      error:
        left > 0
          ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "Too many wrong codes. Try again in fifteen minutes.",
      attemptsLeft: Math.max(0, left),
    };
  }

  await db
    .update(s.otpChallenges)
    .set({ consumedAt: now })
    .where(eq(s.otpChallenges.id, challenge.id));

  const [existing] = await db.select().from(s.members).where(eq(s.members.phone, phone)).limit(1);
  if (existing) {
    if (existing.isBlocked) {
      return { ok: false, error: "This number cannot sign in. Contact support." };
    }
    await db.update(s.members).set({ lastSeenAt: now }).where(eq(s.members.id, existing.id));
    return { ok: true, memberId: existing.id, isNewMember: false };
  }

  const [created] = await db
    .insert(s.members)
    .values({ phone, name: "", areaSlug: "abuja", lastSeenAt: now })
    .returning({ id: s.members.id });

  return { ok: true, memberId: created.id, isNewMember: true };
}

/**
 * Whether the sign-in screen may show the code instead of sending it.
 *
 * Gated on the environment as well as the provider: revealing the code on a
 * public deployment would let anyone sign in as anyone, including the ops desk.
 */
export function otpIsMocked(): boolean {
  return devMocksAllowed() && messengerIsMock();
}

export const OTP_RESEND_SECONDS = CODE_TTL_MINUTES * 60;
