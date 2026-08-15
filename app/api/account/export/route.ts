import { getCurrentMember } from "@/lib/auth/dal";
import { listMemberCommitments } from "@/lib/domain/commitments";
import { listCreditMovements, listMemberDisputes, listMemberRefunds } from "@/lib/domain/support";

/**
 * The NDPA subject access export. Returns everything the app holds about the
 * signed-in member as a JSON download, built from the same reads the app uses
 * so it can never fall out of step with what is on screen.
 */
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return new Response(null, { status: 401 });

  const [commitments, credit, disputes, refunds] = await Promise.all([
    listMemberCommitments(member.id),
    listCreditMovements(member.id),
    listMemberDisputes(member.id),
    listMemberRefunds(member.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      name: member.name,
      phone: member.phone,
      area: member.areaSlug,
      homeHub: member.homeHubId,
      storeCreditKobo: member.creditKobo,
      notifications: {
        whatsapp: member.notifyWhatsapp,
        sms: member.notifySms,
        newPools: member.notifyPoolOpen,
      },
    },
    pools: commitments.map((c) => ({
      pool: c.poolCode,
      title: c.poolTitle,
      hub: c.hubName,
      slots: c.slots,
      paidKobo: c.paidKobo,
      state: c.state,
      shareDate: c.shareDate,
      collectedAt: c.collectedAt,
    })),
    storeCredit: credit.map((m) => ({
      at: m.createdAt,
      label: m.label,
      detail: m.detail,
      amountKobo: m.amountKobo,
    })),
    disputes: disputes.map((d) => ({
      reference: d.reference,
      reason: d.reason,
      detail: d.detail,
      state: d.state,
      raisedAt: d.createdAt,
      resolvedAt: d.resolvedAt,
      resolution: d.resolution,
    })),
    refunds: refunds.map((r) => ({
      reference: r.reference,
      amountKobo: r.amountKobo,
      method: r.method,
      state: r.state,
      reason: r.reason,
      paidAt: r.paidAt,
    })),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bulkieshare-data-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
