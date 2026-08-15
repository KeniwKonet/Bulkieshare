import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "../env";

/**
 * Supabase client factories.
 *
 * Two clients, deliberately separated:
 *
 * - `adminClient()` carries the secret key and bypasses row level security. It
 *   is only ever used for things the user cannot be trusted to do themselves:
 *   creating an auth user, reading auth metadata, writing to private storage.
 * - `userClient(accessToken)` carries the caller's own token, so Postgres sees
 *   them as themselves.
 *
 * Neither is a substitute for the app's own authorisation checks in
 * `lib/auth/dal.ts`.
 */

let cachedAdmin: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return env.supabase.configured;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export async function adminClient(): Promise<SupabaseClient> {
  if (!env.supabase.configured) throw new SupabaseNotConfiguredError();
  if (cachedAdmin) return cachedAdmin;

  const { createClient } = await import("@supabase/supabase-js");
  cachedAdmin = createClient(env.supabase.url!, env.supabase.secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

export async function userClient(accessToken: string): Promise<SupabaseClient> {
  if (!env.supabase.configured) throw new SupabaseNotConfiguredError();

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(env.supabase.url!, env.supabase.publishableKey ?? env.supabase.secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/* ---------------------------------------------------------------------- */
/* Project capabilities                                                    */
/* ---------------------------------------------------------------------- */

interface AuthSettings {
  external?: Record<string, boolean>;
  disable_signup?: boolean;
}

let cachedSettings: { at: number; value: AuthSettings } | null = null;

/**
 * What the project's auth is actually configured to do.
 *
 * Phone sign-in has to be switched on in the dashboard *and* backed by an SMS
 * provider. Asking the project rather than assuming means a misconfiguration
 * surfaces as a clear message instead of a confusing failure at the OTP step.
 * Cached for a minute so this is not an extra round trip on every sign-in.
 */
export async function getAuthSettings(): Promise<AuthSettings | null> {
  if (!env.supabase.url || !env.supabase.publishableKey) return null;
  if (cachedSettings && Date.now() - cachedSettings.at < 60_000) return cachedSettings.value;

  try {
    const res = await fetch(`${env.supabase.url}/auth/v1/settings`, {
      headers: { apikey: env.supabase.publishableKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const value = (await res.json()) as AuthSettings;
    cachedSettings = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

export async function phoneAuthEnabled(): Promise<boolean> {
  const settings = await getAuthSettings();
  return Boolean(settings?.external?.phone);
}
