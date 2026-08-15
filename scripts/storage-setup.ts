/**
 * Creates the private Storage bucket dispute photos live in.
 *
 *   npm run storage:setup
 *
 * Safe to re-run: an existing bucket is left alone. The bucket is private, so
 * photos are only ever readable through a short-lived signed URL.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "dispute-photos";

if (!url || !secret) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first (see .env.example).",
  );
  process.exit(1);
}

async function main() {
  const supabase = createClient(url!, secret!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`Could not list buckets: ${listError.message}`);
    process.exit(1);
  }

  if (existing?.some((b) => b.name === bucket)) {
    console.log(`Bucket "${bucket}" already exists.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  });

  if (error) {
    console.error(`Could not create bucket: ${error.message}`);
    process.exit(1);
  }

  console.log(`Created private bucket "${bucket}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
