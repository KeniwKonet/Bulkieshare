/**
 * Applies the schema and seeds the launch dataset.
 *
 *   npm run db:setup           target DATABASE_URL if set, else local .pglite
 *   npm run db:setup -- --fresh  drop the public schema first, then rebuild
 *
 * Point DATABASE_URL at your Supabase connection string to provision a real
 * project. Without it this writes to the embedded PGlite database that
 * `npm run dev` uses.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { seed } from "../lib/db/seed";
import * as schema from "../lib/db/schema";

const fresh = process.argv.includes("--fresh");
const url = process.env.DATABASE_URL;

/** Every generated migration, in filename order, flattened to statements. */
async function statements(): Promise<string[]> {
  const dir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const out: string[] = [];
  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    out.push(
      ...sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return out;
}

async function main() {
  const ddl = await statements();

  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { prepare: false, max: 1 });

    if (fresh) {
      await client.unsafe("drop schema public cascade; create schema public;");
      console.log("dropped and recreated schema public");
    }
    for (const st of ddl) await client.unsafe(st);
    console.log(`applied ${ddl.length} DDL statements to Supabase`);

    await seed(drizzle(client, { schema }) as never);
    console.log("seeded");
    await client.end();
    return;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = path.join(process.cwd(), ".pglite");
  const client = new PGlite(dir);
  await client.waitReady;

  if (fresh) {
    await client.exec("drop schema public cascade; create schema public;");
    console.log("dropped and recreated schema public");
  }
  for (const st of ddl) await client.exec(st);
  console.log(`applied ${ddl.length} DDL statements to ${dir}`);

  await seed(drizzle(client, { schema }) as never);
  console.log("seeded");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
