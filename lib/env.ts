import "server-only";

/**
 * Every environment variable the server reads, in one place, with an explicit
 * answer to "what happens when this is missing".
 *
 * Nothing here throws at import time. A missing provider key downgrades that
 * provider to its mock, so the app runs end to end on a clean checkout and
 * upgrades to the real service the moment a key appears.
 */

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  /** Supabase Postgres connection string. Unset → embedded PGlite. */
  databaseUrl: optional("DATABASE_URL"),

  /** Signs the session cookie. A dev fallback keeps local sessions working. */
  sessionSecret:
    optional("SESSION_SECRET") ??
    "bulkieshare-development-secret-do-not-use-in-production-000000",

  paystack: {
    secretKey: optional("PAYSTACK_SECRET_KEY"),
    publicKey: optional("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"),
    /** Paystack signs webhooks with the secret key, so this mirrors it. */
    get configured() {
      return Boolean(optional("PAYSTACK_SECRET_KEY"));
    },
  },

  termii: {
    apiKey: optional("TERMII_API_KEY"),
    senderId: optional("TERMII_SENDER_ID") ?? "BulkieShare",
    get configured() {
      return Boolean(optional("TERMII_API_KEY"));
    },
  },

  /**
   * Supabase project credentials.
   *
   * Supabase's newer `sb_publishable_` / `sb_secret_` keys replaced the older
   * anon / service_role JWTs, so both spellings are accepted and the new names
   * win. These reach Storage and the REST API; they cannot open a Postgres
   * connection, which is what `databaseUrl` above is for.
   */
  supabase: {
    url: optional("SUPABASE_URL") ?? optional("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey:
      optional("SUPABASE_PUBLISHABLE_KEY") ?? optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    secretKey: optional("SUPABASE_SECRET_KEY") ?? optional("SUPABASE_SERVICE_ROLE_KEY"),
    jwksUrl: optional("SUPABASE_JWKS_URL"),
    bucket: optional("SUPABASE_STORAGE_BUCKET") ?? "dispute-photos",
    get configured() {
      const url = optional("SUPABASE_URL") ?? optional("NEXT_PUBLIC_SUPABASE_URL");
      const key = optional("SUPABASE_SECRET_KEY") ?? optional("SUPABASE_SERVICE_ROLE_KEY");
      return Boolean(url && key);
    },
  },

  isProduction: process.env.NODE_ENV === "production",
} as const;

/**
 * A deployment that is deliberately a demonstration, not a service.
 *
 * `DEMO_MODE=1` re-enables the development stand-ins on a production build so
 * the whole app can be clicked through without real providers. It is a loaded
 * gun: with it on, the sign-in code is shown on screen, which means anyone who
 * can reach the URL can sign in as anyone, including the ops desk.
 *
 * Only ever set it on a throwaway deployment with seeded data. Never alongside
 * a real DATABASE_URL.
 */
export const isDemoMode = process.env.DEMO_MODE === "1";

/**
 * Whether the development stand-ins may be used at all.
 *
 * The mocks hand out things the real providers charge for: the OTP mock reveals
 * the sign-in code, and the payments mock lets someone mark a transfer as
 * received. Either one reachable on a public deployment is a way in.
 *
 * So they are gated on NODE_ENV rather than merely on whether a provider key is
 * present. In production a missing key means the feature fails loudly, which is
 * the correct outcome: better that nobody can pay than that everybody can
 * pretend to have paid. `DEMO_MODE` is the explicit, opt-in exception.
 */
export function devMocksAllowed(): boolean {
  return !env.isProduction || isDemoMode;
}

/**
 * True when the app is running on mocks rather than real providers. Screens use
 * this to show the dev affordances that would be dangerous in production.
 */
export function isMockMode(): boolean {
  return devMocksAllowed() && !env.paystack.configured;
}
