import "server-only";

import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { env } from "../env";

/**
 * Supabase Auth sessions.
 *
 * Supabase issues a short-lived access token (ES256, verifiable against the
 * project's JWKS) and a long-lived refresh token. Both are kept in httpOnly
 * cookies; the access token is verified on every request without a network
 * call to Supabase, because the signing keys are public and cached.
 *
 * Refreshing has to happen somewhere that can set cookies — a Server Action,
 * a Route Handler, or `proxy.ts`. A Server Component cannot, so `proxy.ts`
 * does it before the page renders.
 */

export const ACCESS_COOKIE = "sb_access";
export const REFRESH_COOKIE = "sb_refresh";

/** Refresh once the token has this long or less to live. */
const REFRESH_WINDOW_SECONDS = 120;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function keySet() {
  if (!jwks) {
    const url =
      env.supabase.jwksUrl ?? `${env.supabase.url}/auth/v1/.well-known/jwks.json`;
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

export interface SupabaseClaims extends JWTPayload {
  /** The auth user id — matches `members.auth_user_id`. */
  sub: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface SupabaseTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
}

/**
 * Verifies an access token's signature and expiry against the project JWKS.
 * Returns null rather than throwing, because an expired or unparseable token
 * is an ordinary "not signed in", not an error condition.
 */
export async function verifyAccessToken(token: string | undefined): Promise<SupabaseClaims | null> {
  if (!token || !env.supabase.url) return null;
  try {
    const { payload } = await jwtVerify(token, keySet(), {
      issuer: `${env.supabase.url}/auth/v1`,
    });
    if (!payload.sub) return null;
    return payload as SupabaseClaims;
  } catch {
    return null;
  }
}

/** Reads claims without verifying — only for deciding whether to refresh. */
export function readExpiry(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const [, body] = token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

export function needsRefresh(token: string | undefined): boolean {
  const exp = readExpiry(token);
  if (exp === null) return false;
  return exp - Math.floor(Date.now() / 1000) <= REFRESH_WINDOW_SECONDS;
}

/**
 * Exchanges a refresh token for a new session. Returns null when the refresh
 * token has been used or revoked, which means the member must sign in again.
 */
export async function refreshTokens(refreshToken: string): Promise<SupabaseTokens | null> {
  if (!env.supabase.url || !env.supabase.publishableKey) return null;

  try {
    const res = await fetch(`${env.supabase.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: env.supabase.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      expires_in?: number;
    };

    if (!json.access_token || !json.refresh_token) return null;

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt:
        json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------- */
/* Cookies                                                                 */
/* ---------------------------------------------------------------------- */

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export async function writeTokens(tokens: SupabaseTokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOptions,
    expires: new Date(tokens.expiresAt * 1000),
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOptions,
    // Refresh tokens outlive the access token; 30 days matches the app session.
    expires: new Date(Date.now() + 30 * 86_400_000),
  });
}

export async function readTokens(): Promise<{ access?: string; refresh?: string }> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value,
    refresh: store.get(REFRESH_COOKIE)?.value,
  };
}

export async function clearTokens(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/** Revokes the session with Supabase so the refresh token cannot be reused. */
export async function signOutUpstream(accessToken: string): Promise<void> {
  if (!env.supabase.url || !env.supabase.publishableKey) return;
  try {
    await fetch(`${env.supabase.url}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: env.supabase.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    // A failed upstream logout still clears our cookies; the token expires anyway.
  }
}
