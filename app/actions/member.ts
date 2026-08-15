"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";

import { requireMember } from "@/lib/auth/dal";
import {
  bookCollectionWindow,
  getOwnedCommitment,
  nameBeneficiary,
} from "@/lib/domain/commitments";
import {
  attachDisputePhotos,
  openDispute,
  takeRefundAsCredit,
  type DisputeReason,
} from "@/lib/domain/support";
import { normalisePhone } from "@/lib/phone";
import { fail, succeed, type FormState } from "./_state";

/**
 * Everything a signed-in member does to their own records: naming the people
 * their slots are for, booking a collection window, raising a dispute, and
 * choosing to take a refund as credit.
 */

const beneficiarySchema = z.object({
  commitmentId: z.string().uuid(),
  slotIndex: z.coerce.number().int().min(1),
  name: z.string().trim().min(2, "Give the full name so the hub can call it out."),
  phone: z.string().trim().optional(),
});

export async function nameSlot(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();

  const parsed = beneficiarySchema.safeParse({
    commitmentId: formData.get("commitmentId"),
    slotIndex: formData.get("slotIndex"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first.message, { [String(first.path.at(-1))]: first.message });
  }

  const owned = await getOwnedCommitment(parsed.data.commitmentId, member.id);
  if (!owned) return fail("That is not your pool.");

  let phone: string | null = null;
  if (parsed.data.phone) {
    try {
      phone = normalisePhone(parsed.data.phone);
    } catch {
      return fail("That phone number does not look right.", {
        phone: "Use a Nigerian mobile number.",
      });
    }
  }

  await nameBeneficiary({
    commitmentId: parsed.data.commitmentId,
    slotIndex: parsed.data.slotIndex,
    name: parsed.data.name,
    phone,
  });

  refresh();
  return succeed(`Slot ${parsed.data.slotIndex} is for ${parsed.data.name}.`);
}

export async function bookWindow(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const commitmentId = String(formData.get("commitmentId") ?? "");
  const at = String(formData.get("at") ?? "");

  const owned = await getOwnedCommitment(commitmentId, member.id);
  if (!owned) return fail("That is not your pool.");

  const when = at ? new Date(at) : null;
  if (at && Number.isNaN(when?.getTime())) return fail("Pick a time from the list.");

  await bookCollectionWindow(commitmentId, when);
  redirect(`/collections/${commitmentId}/pass`);
}

export async function clearWindow(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const commitmentId = String(formData.get("commitmentId") ?? "");

  const owned = await getOwnedCommitment(commitmentId, member.id);
  if (!owned) return fail("That is not your pool.");

  await bookCollectionWindow(commitmentId, null);
  refresh();
  return succeed("Window released.");
}

const disputeSchema = z.object({
  reason: z.enum(["quality", "short_weight", "wrong_cuts", "no_handover", "other"]),
  detail: z.string().trim().min(10, "Tell us what happened, in a sentence or two."),
  commitmentId: z.string().uuid().optional(),
});

export async function raiseDispute(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember("/disputes/new");

  const parsed = disputeSchema.safeParse({
    reason: formData.get("reason"),
    detail: formData.get("detail"),
    commitmentId: formData.get("commitmentId") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first.message, { [String(first.path[0])]: first.message });
  }

  let poolId: string | null = null;
  if (parsed.data.commitmentId) {
    const owned = await getOwnedCommitment(parsed.data.commitmentId, member.id);
    if (!owned) return fail("That is not your pool.");
    poolId = owned.poolId;
  }

  const { id, reference } = await openDispute({
    memberId: member.id,
    commitmentId: parsed.data.commitmentId ?? null,
    poolId,
    reason: parsed.data.reason as DisputeReason,
    detail: parsed.data.detail,
  });

  // Photos are attached after the dispute exists so they can be filed under its
  // reference. A failed upload never loses the complaint itself.
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);
  await attachDisputePhotos(id, reference, photos);

  redirect(`/disputes/${id}`);
}

export async function refundAsCredit(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const refundId = String(formData.get("refundId") ?? "");
  await takeRefundAsCredit(refundId, member.id);
  refresh();
  return succeed("Added to your store credit.");
}
