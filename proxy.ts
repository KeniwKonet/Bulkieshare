import { NextResponse, type NextRequest } from "next/server";

import { decryptSession } from "@/lib/auth/session";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  needsRefresh,
  readExpiry,
  refreshTokens,
} from "@/lib/auth/supabase-session";

/**
 * Two jobs, both of which have to happen before a page renders.
 *
 * 1. Keeping the Supabase session alive. Access tokens are short-lived, and a
 *    Server Component cannot set cookies, so the refresh has to happen here.
 * 2. An optimistic auth gate, so a signed-out visitor lands on the sign-in
 *    screen instead of a flash of empty dashboard.
 *
 * The gate reads cookies only — no database, because Proxy runs on every
 * request including prefetches. Real authorisation, including every role check,
 * happens in `lib/auth/dal.ts`, which each page and Server Action calls. Server
 * Actions are POSTs to the page they live on and can be invoked directly, so
 * this file is never the only thing standing in front of data.
 */

const PROTECTED_PREFIXES = [
  "/my-pools",
  "/account",
  "/commitments",
  "/collections",
  "/pay",
  "/disputes",
  "/refunds",
  "/hub",
  "/admin",
];

/** Signed-in surfaces inside otherwise public sections. */
const PROTECTED_PATTERNS = [
  /^\/supply\/(orders|payouts|requests|scorecard|whatsapp)/,
  /^\/groups\/[^/]+\/(members|fees|pools\/new)/,
  /^\/pools\/[^/]+\/reserve/,
];

function isProtected(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return PROTECTED_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  let response = NextResponse.next();
  let hasSupabaseSession = Boolean(access && (readExpiry(access) ?? 0) > Date.now() / 1000);

  // Renew before the token lapses, so a long browse never bounces to sign-in.
  if (refresh && (!access || needsRefresh(access))) {
    const renewed = await refreshTokens(refresh);
    if (renewed) {
      hasSupabaseSession = true;
      const secure = process.env.NODE_ENV === "production";
      response.cookies.set(ACCESS_COOKIE, renewed.accessToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        expires: new Date(renewed.expiresAt * 1000),
      });
      response.cookies.set(REFRESH_COOKIE, renewed.refreshToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        expires: new Date(Date.now() + 30 * 86_400_000),
      });
    } else {
      // The refresh token is spent or revoked; drop both so the app stops
      // pretending there is a session.
      hasSupabaseSession = false;
      response.cookies.delete(ACCESS_COOKIE);
      response.cookies.delete(REFRESH_COOKIE);
    }
  }

  if (!isProtected(pathname)) return response;

  if (hasSupabaseSession) return response;

  // Fallback session, in use while the Supabase project has phone sign-in off.
  const legacy = await decryptSession(request.cookies.get("bs_session")?.value);
  if (legacy?.memberId) return response;

  const signIn = new URL("/join", request.nextUrl);
  signIn.searchParams.set("next", pathname + search);
  response = NextResponse.redirect(signIn);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
