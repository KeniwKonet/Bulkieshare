import Link from "next/link";

import { CodeLookupForm, HandoverForm } from "@/components/hub-forms";
import { PhoneShell } from "@/components/nav";
import { requireRole } from "@/lib/auth/dal";
import { getCommitment } from "@/lib/domain/commitments";
import { getPool } from "@/lib/domain/pools";

export const metadata = { title: "Record a handover" };

/** Pulls "±8%" out of a tolerance band string into a fraction. */
function parseBand(band: string | null): number | null {
  if (!band) return null;
  const match = band.match(/([\d.]+)\s*%/);
  return match ? Number(match[1]) / 100 : null;
}

/** Pulls "≈2.5kg" out of a unit description into kilograms. */
function parseNominalKg(unitDescription: string): number | null {
  const match = unitDescription.match(/([\d.]+)\s*kg/i);
  return match ? Number(match[1]) : null;
}

export default async function HandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ commitment?: string }>;
}) {
  const { commitment: commitmentId } = await searchParams;
  const agent = await requireRole("hub_agent");
  const hubId = agent.homeHubId ?? "";

  const commitment = commitmentId ? await getCommitment(commitmentId) : null;
  const pool = commitment ? await getPool(commitment.poolId) : null;

  // No one picked yet, or the code lookup step: show the keypad.
  if (!commitment) {
    return (
      <div className="bg-[#8E8C86] min-h-screen py-6">
        <PhoneShell dark>
          <div className="px-4.5 py-3.5 bg-ink border-b border-dark-rule-2 flex justify-between items-center font-mono text-[12px] font-semibold">
            <span>ENTER A CODE</span>
            <Link href="/hub" className="text-dark-dim-2">
              back to list
            </Link>
          </div>
          <div className="px-4.5 py-4.5">
            <p className="text-[15px] leading-relaxed text-dark-dim mb-4">
              Ask for the four digit code on their collection pass. It works offline on their
              phone, so they do not need signal to show it.
            </p>
            <CodeLookupForm hubId={hubId} />
          </div>
        </PhoneShell>
      </div>
    );
  }

  const alreadyDone = commitment.state === "collected";

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell dark>
        <div
          className={`px-4.5 py-3.5 flex justify-between items-center font-mono text-[12px] font-semibold ${
            alreadyDone ? "bg-rust" : "bg-ink border-b border-dark-rule-2"
          }`}
        >
          <span>{alreadyDone ? "ALREADY COLLECTED" : `CODE ${commitment.collectionCode} VALID`}</span>
          <Link href="/hub" className={alreadyDone ? "" : "text-dark-dim-2"}>
            back to list
          </Link>
        </div>

        {alreadyDone ? (
          <div className="px-4.5 py-8">
            <div className="font-display text-[24px] tracking-tight mb-2">
              {commitment.memberName || "This member"} already collected
            </div>
            <p className="text-[15px] leading-relaxed text-dark-dim">
              Their {commitment.slots} slot{commitment.slots === 1 ? "" : "s"} for #
              {commitment.poolCode} {commitment.slots === 1 ? "was" : "were"} handed over. If this
              looks wrong, flag it to the ops desk rather than recording it twice.
            </p>
          </div>
        ) : (
          <HandoverForm
            commitmentId={commitment.id}
            hubId={commitment.hubId}
            memberName={commitment.memberName || "Member"}
            slots={commitment.slots}
            nominalKg={parseNominalKg(commitment.unitDescription)}
            toleranceBand={parseBand(pool?.toleranceBand ?? null)}
          />
        )}
      </PhoneShell>
    </div>
  );
}
