import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Two drivers, one schema.
 *
 * - `DATABASE_URL` set  → postgres-js against Supabase Postgres. This is the
 *   production path. Use the session pooler (port 5432) or the transaction
 *   pooler (6543) URL from the Supabase dashboard.
 * - `DATABASE_URL` unset → PGlite, an embedded Postgres that runs in-process
 *   with no Docker and no server. It persists to `.pglite/` so a restart keeps
 *   your data. This is what makes `npm run dev` work on a clean checkout.
 *
 * Because both are real Postgres, the SQL, the schema and every query in the
 * app are identical either way. Nothing is stubbed on the dev path.
 */

type Ready = { db: Db; driver: "supabase" | "pglite" };

// Cached on globalThis so Turbopack's dev-time module reloading doesn't open a
// second PGlite instance against the same directory.
const globalForDb = globalThis as unknown as { __bulkieshareDb?: Promise<Ready> };

/** Every generated migration, in filename order, flattened to statements. */
export async function readMigrationStatements(): Promise<string[]> {
  const dir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const statements: string[] = [];
  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    statements.push(
      ...sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return statements;
}

/** Whether PGlite can keep a database on disk next to the app. */
async function canWriteHere(): Promise<boolean> {
  try {
    const { access, constants } = await import("node:fs/promises");
    await access(process.cwd(), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function connect(): Promise<Ready> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const [{ drizzle }, postgres] = await Promise.all([
      import("drizzle-orm/postgres-js"),
      import("postgres").then((m) => m.default),
    ]);
    // Supabase's poolers do not support prepared statements on the transaction
    // pooler, so they are disabled for both to keep behaviour consistent.
    const client = postgres(url, { prepare: false, max: 10 });
    return { db: drizzle(client, { schema }) as unknown as Db, driver: "supabase" };
  }

  const [{ PGlite }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);

  // A serverless filesystem is read-only, so a deployment with no DATABASE_URL
  // falls back to an in-memory database. That keeps a preview clickable, but
  // every instance gets its own copy and a cold start wipes it — which is why
  // this shouts rather than failing quietly.
  const durable = await canWriteHere();
  if (!durable) {
    console.warn(
      "[db] No DATABASE_URL and no writable filesystem. Running on an in-memory " +
        "database: data is per-instance and is lost on restart. Set DATABASE_URL " +
        "to your Supabase Postgres connection string for a real deployment.",
    );
  }

  const client = durable ? new PGlite(path.join(process.cwd(), ".pglite")) : new PGlite();
  await client.waitReady;

  // PGlite starts empty on first run, so apply the schema and seed here rather
  // than expecting the developer to run a migrate step before `npm run dev`.
  const already = await client.query<{ count: number }>(
    `select count(*)::int as count from information_schema.tables
     where table_schema = 'public' and table_name = 'pools'`,
  );
  const isFresh = (already.rows[0]?.count ?? 0) === 0;

  if (isFresh) {
    for (const statement of await readMigrationStatements()) {
      await client.exec(statement);
    }
  }

  const db = drizzle(client, { schema }) as unknown as Db;

  if (isFresh) {
    const { seed } = await import("./seed");
    await seed(db);
  }

  return { db, driver: "pglite" };
}

export function getDb(): Promise<Db> {
  globalForDb.__bulkieshareDb ??= connect();
  return globalForDb.__bulkieshareDb.then((r) => r.db);
}

export async function getDriver(): Promise<"supabase" | "pglite"> {
  globalForDb.__bulkieshareDb ??= connect();
  return globalForDb.__bulkieshareDb.then((r) => r.driver);
}

export { schema };
