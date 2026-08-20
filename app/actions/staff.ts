"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireOps, requireRole } from "@/lib/auth/dal";
import { publishAllocation } from "@/lib/domain/allocation";
import { awardQuote, cancelQuoteRequest, createQuoteRequest } from "@/lib/domain/procurement";
import { findByCollectionCode, recordHandover } from "@/lib/domain/commitments";
import {
  addGroupMember,
  canManageGroup,
  createGroup,
  getGroupBySlug,
  removeGroupMember,
  setGroupCoordinator,
  setGroupFee,
  suggestGroupSlug,
} from "@/lib/domain/groups";
import {
  createHub,
  escalateTransfer,
  markTransferReturned,
  recordAudit,
  setMemberRole,
  suggestHubId,
  updateHub,
  resolveTransferAsCredit,
  setAreaLive,
  setMemberBlocked,
} from "@/lib/domain/ops";
import {
  getPool,
  nextPoolCode,
  setPoolState,
  settleClosedPools,
  sweepExpiredHolds,
} from "@/lib/domain/pools";
import {
  grantCredit,
  markRefundPaid,
  refundUnderfilledPool,
  resolveDispute,
} from "@/lib/domain/support";
import {
  approveSupplier,
  createSupplier,
  grantSupplierAccess,
  onboardSupplier,
  recordDelivery,
  recordQc,
  settlePurchaseOrder,
  setWhatsappOptIn,
  submitQuote,
  updateSupplier,
} from "@/lib/domain/supply";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { formatKobo, nairaToKobo } from "@/lib/money";
import { normalisePhone } from "@/lib/phone";
import { addDays } from "@/lib/time";
import { fail, succeed, type FormState } from "./_state";

/**
 * Actions for the hub agent, coordinator, supplier and ops surfaces. Every one
 * of them starts with a role check — the routing that hides these screens is
 * convenience, not security.
 */

/** Goodwill above this needs a second approver, so it is refused here. */
const GOODWILL_CEILING_NAIRA = 50_000;

type MemberRole = (typeof s.memberRoleEnum.enumValues)[number];

/* ---------------------------------------------------------------------- */
/* Hub agent                                                               */
/* ---------------------------------------------------------------------- */

export async function checkCollectionCode(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const agent = await requireRole("hub_agent");
  const hubId = String(formData.get("hubId") ?? agent.homeHubId ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (code.length !== 4) return fail("Collection codes are four digits.");

  const match = await findByCollectionCode(hubId, code);
  if (!match) return fail("No one at this hub has that code.");
  if (match.alreadyCollected > 0) {
    return fail(`${match.memberName} already collected for ${match.poolCode}.`);
  }

  return succeed(`${match.memberName} · ${match.slots} slot(s) · ${match.poolTitle}`);
}

export async function handOver(_state: FormState, formData: FormData): Promise<FormState> {
  const agent = await requireRole("hub_agent");
  const commitmentId = String(formData.get("commitmentId") ?? "");
  const hubId = String(formData.get("hubId") ?? agent.homeHubId ?? "");
  const weightKg = Number(formData.get("weightKg") ?? 0);

  if (!commitmentId || !hubId) return fail("Pick someone from the list first.");

  await recordHandover({
    commitmentId,
    hubId,
    agentId: agent.id,
    weightGrams: weightKg > 0 ? Math.round(weightKg * 1000) : null,
    notes: String(formData.get("notes") ?? "") || null,
    capturedOffline: formData.get("offline") === "1",
  });

  refresh();
  return succeed("Handover recorded.");
}

/* ---------------------------------------------------------------------- */
/* Coordinator                                                             */
/* ---------------------------------------------------------------------- */

export async function inviteToGroup(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireRole("coordinator");
  const slug = String(formData.get("group") ?? "");

  if (!(await canManageGroup(slug, member.id, member.role))) {
    return fail("You do not run this group.");
  }

  let phone: string;
  try {
    phone = normalisePhone(String(formData.get("phone") ?? ""));
  } catch {
    return fail("Use a Nigerian mobile number, for example 0803 441 9022.");
  }

  const group = await getGroupBySlug(slug);
  if (!group) return fail("That group no longer exists.");

  const db = await getDb();
  const [existing] = await db
    .select({ id: s.members.id })
    .from(s.members)
    .where(eq(s.members.phone, phone))
    .limit(1);

  const memberId =
    existing?.id ??
    (
      await db
        .insert(s.members)
        .values({ phone, name: "", areaSlug: group.areaSlug })
        .returning({ id: s.members.id })
    )[0].id;

  await addGroupMember(group.id, memberId);
  refresh();
  return succeed("Added. They will see your pools when they sign in.");
}

export async function removeFromGroup(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireRole("coordinator");
  const slug = String(formData.get("group") ?? "");
  if (!(await canManageGroup(slug, member.id, member.role))) {
    return fail("You do not run this group.");
  }

  const group = await getGroupBySlug(slug);
  if (!group) return fail("That group no longer exists.");

  await removeGroupMember(group.id, String(formData.get("memberId") ?? ""));
  refresh();
  return succeed("Removed.");
}

export async function updateGroupFee(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireRole("coordinator");
  const slug = String(formData.get("group") ?? "");
  if (!(await canManageGroup(slug, member.id, member.role))) {
    return fail("You do not run this group.");
  }

  const group = await getGroupBySlug(slug);
  if (!group) return fail("That group no longer exists.");

  const pct = Number(formData.get("feePct") ?? 3);
  if (!Number.isFinite(pct) || pct < 0 || pct > 10) {
    return fail("A coordinator fee has to be between 0% and 10%.");
  }

  await setGroupFee(group.id, Math.round(pct * 100));
  refresh();
  return succeed(`Fee set to ${pct}%.`);
}

/* ---------------------------------------------------------------------- */
/* Supplier                                                                */
/* ---------------------------------------------------------------------- */

const quoteSchema = z.object({
  quoteRequestId: z.string().uuid(),
  priceNaira: z.coerce.number().positive("Enter the price you can hold."),
  holdDays: z.coerce.number().int().min(1).max(30),
  note: z.string().trim().optional(),
});

export async function sendQuote(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireRole("supplier");
  if (!member.supplierId) return fail("Finish onboarding before quoting.");

  const parsed = quoteSchema.safeParse({
    quoteRequestId: formData.get("quoteRequestId"),
    priceNaira: formData.get("priceNaira"),
    holdDays: formData.get("holdDays"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return fail(parsed.error.issues[0].message);

  await submitQuote({
    quoteRequestId: parsed.data.quoteRequestId,
    supplierId: member.supplierId,
    priceKobo: nairaToKobo(parsed.data.priceNaira),
    holdDays: parsed.data.holdDays,
    note: parsed.data.note,
  });

  refresh();
  return succeed("Quote sent. We come back to you inside the hold window.");
}

export async function startSupplierOnboarding(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const member = await requireRole("member", "supplier");
  const name = String(formData.get("name") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();

  if (name.length < 2) return fail("What is the business called?");

  let contactPhone: string;
  try {
    contactPhone = normalisePhone(String(formData.get("contactPhone") ?? member.phone));
  } catch {
    return fail("Use a Nigerian mobile number.");
  }

  await onboardSupplier({
    memberId: member.id,
    name,
    contactName: contactName || member.name,
    contactPhone,
    bankName: String(formData.get("bankName") ?? "") || undefined,
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "") || undefined,
    bankAccountName: String(formData.get("bankAccountName") ?? "") || undefined,
  });

  redirect("/supply/requests");
}

export async function toggleWhatsapp(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireRole("supplier");
  if (!member.supplierId) return fail("Finish onboarding first.");
  await setWhatsappOptIn(member.supplierId, formData.get("optIn") === "on");
  refresh();
  return succeed("Saved.");
}

/* ---------------------------------------------------------------------- */
/* Ops                                                                     */
/* ---------------------------------------------------------------------- */

export async function resolveDisputeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();
  const disputeId = String(formData.get("disputeId") ?? "");
  const outcome = formData.get("outcome") === "rejected" ? "rejected" : "resolved";
  const resolution = String(formData.get("resolution") ?? "").trim();
  const creditNaira = Number(formData.get("creditNaira") ?? 0);

  if (resolution.length < 5) return fail("Write what you decided and why.");

  await resolveDispute({
    disputeId,
    outcome,
    resolution,
    creditKobo: creditNaira > 0 ? nairaToKobo(creditNaira) : undefined,
    actorId: ops.id,
  });

  refresh();
  return succeed("Dispute closed.");
}

export async function payRefund(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await markRefundPaid(String(formData.get("refundId") ?? ""), ops.id);
  refresh();
  return succeed("Marked as paid.");
}

export async function refundPool(_state: FormState, formData: FormData): Promise<FormState> {
  await requireOps();
  const poolId = String(formData.get("poolId") ?? "");
  const n = await refundUnderfilledPool(
    poolId,
    "Pool did not reach its threshold and was cancelled.",
  );
  refresh();
  return succeed(`${n} refund${n === 1 ? "" : "s"} raised.`);
}

export async function creditUnmatched(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await resolveTransferAsCredit(
    String(formData.get("transferId") ?? ""),
    String(formData.get("memberId") ?? ""),
    ops.id,
  );
  refresh();
  return succeed("Applied as store credit.");
}

export async function returnUnmatched(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await markTransferReturned(String(formData.get("transferId") ?? ""), ops.id);
  refresh();
  return succeed("Marked as returned to sender.");
}

export async function escalateUnmatched(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await escalateTransfer(String(formData.get("transferId") ?? ""), ops.id);
  refresh();
  return succeed("Escalated. Call before applying anything.");
}

export async function movePoolState(_state: FormState, formData: FormData): Promise<FormState> {
  await requireOps();
  const poolId = String(formData.get("poolId") ?? "");
  const state = String(formData.get("state") ?? "") as Parameters<typeof setPoolState>[1];
  await setPoolState(poolId, state);
  refresh();
  return succeed(`Pool moved to ${state}.`);
}

export async function publishAllocationAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();
  await publishAllocation(String(formData.get("poolId") ?? ""), ops.id);
  refresh();
  return succeed("Allocation published. Members can see their share now.");
}

export async function runSweep(): Promise<void> {
  await requireOps();
  await sweepExpiredHolds();
  await settleClosedPools();
  refresh();
}

export async function markDelivered(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await recordDelivery(String(formData.get("po") ?? ""), ops.id);
  refresh();
  return succeed("Marked as delivered.");
}

export async function recordIntakeQc(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  const settleNaira = Number(formData.get("settleNaira") ?? 0);

  await recordQc({
    po: String(formData.get("po") ?? ""),
    passed: formData.get("outcome") !== "fail",
    note: String(formData.get("note") ?? "") || undefined,
    settleKobo: settleNaira > 0 ? nairaToKobo(settleNaira) : undefined,
    actorId: ops.id,
  });

  refresh();
  return succeed("QC recorded and the balance is queued for payout.");
}

export async function settlePo(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await settlePurchaseOrder(String(formData.get("po") ?? ""), ops.id);
  refresh();
  return succeed("Supplier balance released.");
}

export async function blockMember(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await setMemberBlocked(
    String(formData.get("memberId") ?? ""),
    formData.get("blocked") === "1",
    ops.id,
  );
  refresh();
  return succeed("Saved.");
}

/* ---------------------------------------------------------------------- */
/* Ops: suppliers                                                          */
/* ---------------------------------------------------------------------- */

export async function setSupplierApproval(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();
  const result = await approveSupplier(
    String(formData.get("supplierId") ?? ""),
    formData.get("approved") === "1",
    ops.id,
  );
  if (!result.ok) return fail(result.error);
  refresh();
  return succeed(formData.get("approved") === "1" ? "Approved." : "Approval withdrawn.");
}

export async function editSupplier(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  const supplierId = String(formData.get("supplierId") ?? "");

  const rawPhone = String(formData.get("contactPhone") ?? "").trim();
  let contactPhone: string | undefined;
  if (rawPhone) {
    try {
      contactPhone = normalisePhone(rawPhone);
    } catch {
      return fail("That contact number does not look right.", { contactPhone: "Nigerian mobile." });
    }
  }

  await updateSupplier(
    supplierId,
    {
      name: String(formData.get("name") ?? "").trim() || undefined,
      contactName: String(formData.get("contactName") ?? "").trim() || undefined,
      contactPhone,
      bankName: String(formData.get("bankName") ?? "").trim() || undefined,
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim() || undefined,
      bankAccountName: String(formData.get("bankAccountName") ?? "").trim() || undefined,
    },
    ops.id,
  );

  refresh();
  return succeed("Saved.");
}

export async function addSupplier(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("What is the business called?", { name: "Required." });

  const rawPhone = String(formData.get("contactPhone") ?? "").trim();
  let contactPhone: string | undefined;
  if (rawPhone) {
    try {
      contactPhone = normalisePhone(rawPhone);
    } catch {
      return fail("That contact number does not look right.", { contactPhone: "Nigerian mobile." });
    }
  }

  const id = await createSupplier({
    name,
    contactName: String(formData.get("contactName") ?? "").trim() || undefined,
    contactPhone,
    bankName: String(formData.get("bankName") ?? "").trim() || undefined,
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim() || undefined,
    bankAccountName: String(formData.get("bankAccountName") ?? "").trim() || undefined,
    actorId: ops.id,
  });

  redirect(`/admin/suppliers/${id}`);
}

export async function addSupplierUser(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();

  let phone: string;
  try {
    phone = normalisePhone(String(formData.get("phone") ?? ""));
  } catch {
    return fail("Use a Nigerian mobile number.");
  }

  const result = await grantSupplierAccess(
    String(formData.get("supplierId") ?? ""),
    phone,
    ops.id,
  );
  if (!result.ok) return fail(result.error);

  refresh();
  return succeed("They can now sign in to the supplier portal.");
}

/* ---------------------------------------------------------------------- */
/* Ops: cooperatives                                                       */
/* ---------------------------------------------------------------------- */

export async function addGroup(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("What is the cooperative called?", { name: "Required." });

  let phone: string;
  try {
    phone = normalisePhone(String(formData.get("coordinatorPhone") ?? ""));
  } catch {
    return fail("Use a Nigerian mobile number for the coordinator.", {
      coordinatorPhone: "Nigerian mobile.",
    });
  }

  const db = await getDb();
  const [coordinator] = await db
    .select({ id: s.members.id })
    .from(s.members)
    .where(eq(s.members.phone, phone))
    .limit(1);

  if (!coordinator) {
    return fail("No member with that number. Ask them to sign in once, then try again.", {
      coordinatorPhone: "Not signed up yet.",
    });
  }

  const areaSlug = String(formData.get("areaSlug") ?? "").trim();
  if (!areaSlug) return fail("Pick an area.");

  const slug = await suggestGroupSlug(name);
  await createGroup({
    name,
    slug,
    areaSlug,
    hubId: String(formData.get("hubId") ?? "").trim() || undefined,
    coordinatorId: coordinator.id,
  });

  await recordAudit({
    actorId: ops.id,
    actorLabel: "Ops desk",
    action: "group.created",
    subject: name,
    detail: { slug, coordinatorId: coordinator.id },
  });

  redirect(`/admin/groups/${slug}`);
}

export async function changeCoordinator(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();

  let phone: string;
  try {
    phone = normalisePhone(String(formData.get("phone") ?? ""));
  } catch {
    return fail("Use a Nigerian mobile number.");
  }

  const result = await setGroupCoordinator(
    String(formData.get("groupId") ?? ""),
    phone,
    ops.id,
  );
  if (!result.ok) return fail(result.error);

  refresh();
  return succeed("Cooperative handed over.");
}

export async function setGroupFeeAsOps(_state: FormState, formData: FormData): Promise<FormState> {
  await requireOps();
  const pct = Number(formData.get("feePct") ?? 3);
  if (!Number.isFinite(pct) || pct < 0 || pct > 10) {
    return fail("A coordinator fee has to be between 0% and 10%.");
  }
  await setGroupFee(String(formData.get("groupId") ?? ""), Math.round(pct * 100));
  refresh();
  return succeed(`Fee set to ${pct}%.`);
}

export async function toggleArea(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await setAreaLive(String(formData.get("area") ?? ""), formData.get("live") === "1", ops.id);
  refresh();
  return succeed("Saved.");
}

/* ---------------------------------------------------------------------- */
/* Creating pools                                                          */
/* ---------------------------------------------------------------------- */

const poolSchema = z.object({
  title: z.string().trim().min(3, "Give the pool a name members will recognise."),
  areaSlug: z.string().trim().min(2),
  hubId: z.string().trim().min(1, "Pick the hub people collect from."),
  category: z.enum(["meat", "grains", "produce", "other"]),
  totalSlots: z.coerce.number().int().min(2, "A pool needs at least two slots."),
  threshold: z.coerce.number().int().min(1),
  priceNaira: z.coerce.number().positive("Set the price per slot."),
  unitDescription: z.string().trim().min(3, "Say what one slot gets you."),
  description: z.string().trim().optional(),
  closesInDays: z.coerce.number().int().min(1).max(60),
  shareInDays: z.coerce.number().int().min(1).max(90),
});

export async function createPool(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRole("coordinator");

  const parsed = poolSchema.safeParse({
    title: formData.get("title"),
    areaSlug: formData.get("areaSlug"),
    hubId: formData.get("hubId"),
    category: formData.get("category"),
    totalSlots: formData.get("totalSlots"),
    threshold: formData.get("threshold"),
    priceNaira: formData.get("priceNaira"),
    unitDescription: formData.get("unitDescription"),
    description: formData.get("description") || undefined,
    closesInDays: formData.get("closesInDays"),
    shareInDays: formData.get("shareInDays"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first.message, { [String(first.path[0])]: first.message });
  }

  const d = parsed.data;
  if (d.threshold > d.totalSlots) {
    return fail("The threshold cannot be higher than the number of slots.", {
      threshold: "Lower than total slots.",
    });
  }
  if (d.shareInDays <= d.closesInDays) {
    return fail("The share date has to be after the pool closes.", {
      shareInDays: "Later than the closing date.",
    });
  }

  const groupSlug = String(formData.get("group") ?? "");
  let groupId: string | null = null;
  if (groupSlug) {
    if (!(await canManageGroup(groupSlug, actor.id, actor.role))) {
      return fail("You do not run this group.");
    }
    groupId = (await getGroupBySlug(groupSlug))?.id ?? null;
  }

  const db = await getDb();
  const { id, code } = await nextPoolCode(d.areaSlug);
  const now = new Date();

  await db.insert(s.pools).values({
    id,
    code,
    areaSlug: d.areaSlug,
    hubId: d.hubId,
    groupId,
    title: d.title,
    category: d.category,
    description: d.description ?? "",
    unitDescription: d.unitDescription,
    photoCaption: d.title.toLowerCase(),
    totalSlots: d.totalSlots,
    threshold: d.threshold,
    pricePerSlotKobo: nairaToKobo(d.priceNaira),
    state: "open",
    closesAt: addDays(now, d.closesInDays),
    shareDate: addDays(now, d.shareInDays),
  });

  await db.insert(s.poolEvents).values({ poolId: id, label: "Pool opened" });

  redirect(groupSlug ? `/groups/${groupSlug}/pools/${id}` : `/admin/pools`);
}

/* ---------------------------------------------------------------------- */
/* Ops: procurement                                                        */
/* ---------------------------------------------------------------------- */

const rfqSchema = z.object({
  title: z.string().trim().min(3, "Say what you are buying."),
  description: z.string().trim().optional(),
  poolId: z.string().trim().optional(),
  hubId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1, "At least one."),
  lastPriceNaira: z.coerce.number().nonnegative().optional(),
  depositPct: z.coerce.number().int().min(0).max(100),
  minHoldDays: z.coerce.number().int().min(1).max(60),
  closesInDays: z.coerce.number().int().min(1).max(60),
});

export async function raiseQuoteRequest(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();

  const parsed = rfqSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    poolId: formData.get("poolId") || undefined,
    hubId: formData.get("hubId") || undefined,
    quantity: formData.get("quantity"),
    lastPriceNaira: formData.get("lastPriceNaira") || undefined,
    depositPct: formData.get("depositPct"),
    minHoldDays: formData.get("minHoldDays"),
    closesInDays: formData.get("closesInDays"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first.message, { [String(first.path[0])]: first.message });
  }

  const d = parsed.data;

  let areaSlug: string | null = null;
  if (d.poolId) {
    const pool = await getPool(d.poolId);
    if (!pool) return fail("That pool no longer exists.");
    areaSlug = pool.areaSlug;
  }

  const id = await createQuoteRequest({
    title: d.title,
    description: d.description,
    poolId: d.poolId ?? null,
    areaSlug,
    hubId: d.hubId ?? null,
    quantity: d.quantity,
    lastPriceKobo: d.lastPriceNaira ? nairaToKobo(d.lastPriceNaira) : null,
    depositPct: d.depositPct,
    minHoldDays: d.minHoldDays,
    expiresAt: addDays(new Date(), d.closesInDays),
    actorId: ops.id,
  });

  redirect(`/admin/procurement/${id}`);
}

export async function awardQuoteAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();
  const result = await awardQuote(String(formData.get("quoteId") ?? ""), ops.id);
  if (!result.ok) return fail(result.error);

  refresh();
  return succeed(
    `${result.po} issued. ${formatKobo(result.depositKobo)} deposit is now due to the supplier.`,
  );
}

export async function cancelRfq(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  await cancelQuoteRequest(String(formData.get("quoteRequestId") ?? ""), ops.id);
  refresh();
  return succeed("Request closed. Suppliers can no longer quote on it.");
}

/* ---------------------------------------------------------------------- */
/* Ops: hubs                                                               */
/* ---------------------------------------------------------------------- */

const hubSchema = z.object({
  name: z.string().trim().min(2, "Give the hub a name people will recognise."),
  areaSlug: z.string().trim().min(2, "Pick an area."),
  address: z.string().trim().min(4, "Where is it?"),
  landmark: z.string().trim().optional(),
  windows: z.string().trim().optional(),
  capacityPerHour: z.coerce.number().int().min(1).max(200),
  notes: z.string().trim().optional(),
});

export async function addHub(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();

  const parsed = hubSchema.safeParse({
    name: formData.get("name"),
    areaSlug: formData.get("areaSlug"),
    address: formData.get("address"),
    landmark: formData.get("landmark") || undefined,
    windows: formData.get("windows") || undefined,
    capacityPerHour: formData.get("capacityPerHour"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first.message, { [String(first.path[0])]: first.message });
  }

  const id = await suggestHubId(parsed.data.name);
  await createHub({ ...parsed.data, id, actorId: ops.id });

  redirect(`/admin/hubs/${id}`);
}

export async function editHub(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  const capacity = Number(formData.get("capacityPerHour") ?? 0);

  await updateHub(
    String(formData.get("hubId") ?? ""),
    {
      name: String(formData.get("name") ?? "").trim() || undefined,
      address: String(formData.get("address") ?? "").trim() || undefined,
      landmark: String(formData.get("landmark") ?? "").trim() || undefined,
      windows: String(formData.get("windows") ?? "").trim() || undefined,
      capacityPerHour: capacity > 0 ? capacity : undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
    ops.id,
  );

  refresh();
  return succeed("Saved.");
}

export async function setHubActive(_state: FormState, formData: FormData): Promise<FormState> {
  const ops = await requireOps();
  const active = formData.get("active") === "1";
  await updateHub(String(formData.get("hubId") ?? ""), { isActive: active }, ops.id);
  refresh();
  return succeed(active ? "Hub reopened." : "Hub closed to new pools.");
}

/* ---------------------------------------------------------------------- */
/* Ops: member administration                                              */
/* ---------------------------------------------------------------------- */

export async function changeMemberRole(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "") as MemberRole;

  if (!(s.memberRoleEnum.enumValues as readonly string[]).includes(role)) {
    return fail("That is not a role.");
  }

  if (memberId === ops.id && role !== "ops" && role !== "admin") {
    return fail("You cannot take your own ops access away. Ask a colleague to do it.");
  }

  await setMemberRole(memberId, role, ops.id);

  const hubId = String(formData.get("homeHubId") ?? "").trim();
  if (role === "hub_agent" && hubId) {
    const db = await getDb();
    await db.update(s.members).set({ homeHubId: hubId }).where(eq(s.members.id, memberId));
  }

  refresh();
  return succeed(`Role set to ${role.replace("_", " ")}.`);
}

export async function giveGoodwillCredit(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const ops = await requireOps();

  const naira = Number(formData.get("amountNaira") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isFinite(naira) || naira <= 0) return fail("How much?");
  if (reason.length < 4) {
    return fail("Say what this is for — the member reads it on their own ledger.");
  }
  if (naira > GOODWILL_CEILING_NAIRA) {
    return fail(
      `Anything above ${formatKobo(nairaToKobo(GOODWILL_CEILING_NAIRA))} needs a second approver.`,
    );
  }

  await grantCredit({
    memberId: String(formData.get("memberId") ?? ""),
    label: "Goodwill credit",
    detail: reason,
    amountKobo: nairaToKobo(naira),
    actorId: ops.id,
  });

  refresh();
  return succeed(`${formatKobo(nairaToKobo(naira))} credited.`);
}
