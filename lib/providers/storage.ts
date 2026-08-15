import "server-only";

import { randomUUID } from "node:crypto";

import { env } from "../env";

/**
 * File storage for dispute photos and hub evidence.
 *
 * Backed by Supabase Storage in a private bucket: nothing is publicly
 * readable, and ops views a photo through a short-lived signed URL. A member
 * photographing spoiled fish is handing us evidence about themselves, so the
 * default has to be closed.
 *
 * With no Supabase credentials the mock accepts the upload and returns a key
 * that resolves to nothing, so the dispute flow still completes locally.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export interface StoredFile {
  key: string;
  bytes: number;
  contentType: string;
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function assertAcceptable(file: File): void {
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > MAX_BYTES) {
    throw new UploadError("Photos need to be under 8MB. Try one straight from your camera roll.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new UploadError("Attach a photo — JPEG, PNG, WebP or HEIC.");
  }
}

async function client() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(env.supabase.url!, env.supabase.secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Uploads under a per-dispute prefix so everything about one complaint can be
 * found, listed or deleted together when a member exercises erasure.
 */
export async function uploadDisputePhoto(
  file: File,
  disputeReference: string,
): Promise<StoredFile> {
  assertAcceptable(file);

  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `disputes/${disputeReference}/${randomUUID()}.${extension}`;

  if (!env.supabase.configured) {
    console.info(`[storage:mock] would upload ${file.size}B to ${key}`);
    return { key, bytes: file.size, contentType: file.type };
  }

  const supabase = await client();
  const { error } = await supabase.storage
    .from(env.supabase.bucket)
    .upload(key, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new UploadError(`Could not save that photo: ${error.message}`);

  return { key, bytes: file.size, contentType: file.type };
}

/** Short-lived read URL. The bucket is private, so this is the only way in. */
export async function getSignedUrl(key: string, expiresInSeconds = 300): Promise<string | null> {
  if (!env.supabase.configured) return null;

  const supabase = await client();
  const { data, error } = await supabase.storage
    .from(env.supabase.bucket)
    .createSignedUrl(key, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}

/** Used when a member asks for erasure; storage is not covered by the DB cascade. */
export async function deleteDisputePhotos(keys: string[]): Promise<void> {
  if (!env.supabase.configured || keys.length === 0) return;
  const supabase = await client();
  await supabase.storage.from(env.supabase.bucket).remove(keys);
}

export function storageIsMocked(): boolean {
  return !env.supabase.configured;
}
