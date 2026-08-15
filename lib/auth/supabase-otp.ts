import "server-only";

import { env } from "../env";
import { phoneAuthEnabled } from "../supabase/client";
import type { SupabaseTokens } from "./supabase-session";

/**
 * Phone sign-in through Supabase Auth.
 *
 * Supabase owns the code: it generates it, sends it through whichever SMS
 * provider the project is configured with, enforces expiry and rate limits,
 * and issues the session on success. This app never sees the code.
 *
 * That requires two things switched on in the Supabase dashboard:
 *   1. Authentication → Sign In / Providers → Phone → enabled
 *   2. An SMS provider configured (Twilio, Vonage, MessageBird, Textlocal),
 *      or a Send SMS auth hook if you want to keep delivering through Termii.
 *
 * Until both are done `available()` is false and the caller falls back.
 */

export async function available(): Promise<boolean> {
  return env.supabase.configured && (await phoneAuthEnabled());
}

function headers() {
  return {
    apikey: env.supabase.publishableKey!,
    "Content-Type": "application/json",
  };
}

interface SupabaseAuthError {
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
  error_code?: string;
}

/** Supabase's messages are developer-facing; these are the ones members see. */
function readableError(status: number, body: SupabaseAuthError): string {
  const code = body.error_code ?? "";
  const raw = body.error_description ?? body.msg ?? body.message ?? body.error ?? "";

  if (status === 429 || code === "over_sms_send_rate_limit") {
    return "Too many codes requested. Wait a minute and try again.";
  }
  if (code === "otp_expired" || /expired/i.test(raw)) {
    return "That code has expired. Ask for a new one.";
  }
  if (code === "invalid_credentials" || /invalid/i.test(raw)) {
    return "That code is not right. Check it and try again.";
  }
  if (code === "signup_disabled") {
    return "New sign-ups are closed at the moment.";
  }
  return raw || "Could not send your code. Try again in a moment.";
}

export type RequestResult = { ok: true } | { ok: false; error: string };

export async function requestOtp(phone: string): Promise<RequestResult> {
  if (!env.supabase.url || !env.supabase.publishableKey) {
    return { ok: false, error: "Sign-in is not configured." };
  }

  try {
    const res = await fetch(`${env.supabase.url}/auth/v1/otp`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ phone, create_user: true }),
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: readableError(res.status, await res.json().catch(() => ({}))) };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the sign-in service." };
  }
}

export type VerifyResult =
  | { ok: true; tokens: SupabaseTokens; authUserId: string; phone: string }
  | { ok: false; error: string };

export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  if (!env.supabase.url || !env.supabase.publishableKey) {
    return { ok: false, error: "Sign-in is not configured." };
  }

  try {
    const res = await fetch(`${env.supabase.url}/auth/v1/verify`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ phone, token: code, type: "sms" }),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => ({}))) as SupabaseAuthError & {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      expires_in?: number;
      user?: { id?: string; phone?: string };
    };

    if (!res.ok || !json.access_token || !json.refresh_token || !json.user?.id) {
      return { ok: false, error: readableError(res.status, json) };
    }

    return {
      ok: true,
      authUserId: json.user.id,
      // Supabase stores phone without the leading +; put it back so it matches
      // the E.164 form every other table in this app uses.
      phone: json.user.phone ? `+${json.user.phone.replace(/^\+/, "")}` : phone,
      tokens: {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt:
          json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
      },
    };
  } catch {
    return { ok: false, error: "Could not reach the sign-in service." };
  }
}
