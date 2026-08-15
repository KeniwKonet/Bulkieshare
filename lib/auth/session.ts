import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { env } from "../env";

/**
 * Sessions are a signed cookie carrying only a session id and member id. The
 * session row in the database is the authority — deleting or revoking it logs
 * the member out everywhere, which a pure stateless JWT could not do.
 */

const COOKIE = "bs_session";
const MAX_AGE_DAYS = 30;

const key = new TextEncoder().encode(env.sessionSecret);

export interface SessionPayload {
  sessionId: string;
  memberId: string;
}

export async function encryptSession(payload: SessionPayload, expiresAt: Date): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, key, { algorithms: ["HS256"] });
    if (!payload.sessionId || !payload.memberId) return null;
    return { sessionId: payload.sessionId, memberId: payload.memberId };
  } catch {
    // Expired, tampered with, or signed by a previous SESSION_SECRET.
    return null;
  }
}

export function sessionExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + MAX_AGE_DAYS * 86_400_000);
}

export async function writeSessionCookie(payload: SessionPayload, expiresAt: Date): Promise<void> {
  const token = await encryptSession(payload, expiresAt);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decryptSession(store.get(COOKIE)?.value);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export const SESSION_COOKIE_NAME = COOKIE;
