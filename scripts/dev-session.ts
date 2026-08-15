/**
 * Mints a signed session cookie for one of the seeded demo accounts, so the
 * signed-in surfaces can be exercised from curl or a REST client without
 * walking the OTP flow by hand.
 *
 *   npm run dev:session -- member      # or coordinator | hubAgent | supplier | ops
 *
 * Development only: it refuses to run when NODE_ENV is production, and it
 * writes to the same database `next dev` reads, so the session is real.
 */

import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { SignJWT } from "jose";

import * as schema from "../lib/db/schema";
import { DEMO_PHONES } from "../lib/db/seed";

if (process.env.NODE_ENV === "production") {
  console.error("dev-session is not available in production.");
  process.exit(1);
}

const role = (process.argv[2] ?? "member") as keyof typeof DEMO_PHONES;
const phone = DEMO_PHONES[role];

if (!phone) {
  console.error(`Unknown role "${role}". Try: ${Object.keys(DEMO_PHONES).join(", ")}`);
  process.exit(1);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    console.error("dev-session only targets the local PGlite database.");
    process.exit(1);
  }

  // Read the same secret lib/env.ts falls back to, so the cookie verifies.
  const secret =
    process.env.SESSION_SECRET ??
    "bulkieshare-development-secret-do-not-use-in-production-000000";

  const client = new PGlite(path.join(process.cwd(), ".pglite"));
  await client.waitReady;
  const db = drizzle(client, { schema });

  const [member] = await db
    .select({ id: schema.members.id, name: schema.members.name })
    .from(schema.members)
    .where(eq(schema.members.phone, phone))
    .limit(1);

  if (!member) {
    console.error(`No seeded member for ${phone}. Run: npm run db:reset`);
    process.exit(1);
  }

  const expiresAt = new Date(Date.now() + 30 * 86_400_000);
  const [session] = await db
    .insert(schema.sessions)
    .values({ memberId: member.id, userAgent: "dev-session script", expiresAt })
    .returning({ id: schema.sessions.id });

  const token = await new SignJWT({ sessionId: session.id, memberId: member.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));

  await client.close();

  console.log(`# ${role} — ${member.name} (${phone})`);
  console.log(`bs_session=${token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
