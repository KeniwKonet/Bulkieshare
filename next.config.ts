import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM build of Postgres and must stay out of the bundler so
  // its .wasm/.data assets resolve from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],

  // The migrations are read at runtime with `readdir`/`readFile`, which Next's
  // dependency tracing cannot follow. Without this they are missing from the
  // serverless bundle and the embedded database has no schema to apply.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/*.sql"],
  },
};

export default nextConfig;
