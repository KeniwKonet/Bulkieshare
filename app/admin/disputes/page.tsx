import { OpsHeader } from "@/components/nav";
import { Btn, GridTable } from "@/components/ui";
import { DISPUTES } from "@/lib/mock-data";

export const metadata = { title: "Disputes" };

export default function DisputesPage() {
  const featured = DISPUTES[0];
  const rest = DISPUTES.slice(1);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="disputes" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-[26px] tracking-tight">Disputes · 7 open</h1>
          <span className="font-mono text-[11.5px] text-rust-dark">1 BREACHING SLA IN 4H</span>
        </div>

        <div className="border border-rust-dark bg-card p-4.5 mb-4">
          <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
            <span className="text-[17px] font-bold">{featured.reason}</span>
            <span className="font-mono text-[11.5px] bg-rust-dark text-white px-1.5 py-1">
              44H ELAPSED · SLA 48H
            </span>
          </div>
          <div className="font-mono text-[11.5px] text-text-dim mb-2.5">
            {featured.member.toUpperCase()} · {featured.pool} · {featured.hub?.toUpperCase()} · {featured.photos} PHOTOS
          </div>
          <p className="text-[14.5px] leading-relaxed text-text-mid mb-3.5">{featured.detail}</p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="dark" size="sm">
              Credit ₦4,600
            </Btn>
            <Btn variant="outline" size="sm">
              Replace next pool
            </Btn>
            <Btn variant="outline" size="sm">
              Refuse with reason
            </Btn>
          </div>
        </div>

        <GridTable
          columns="1.4fr 1.2fr .9fr .9fr"
          headers={["MEMBER", "REASON", "POOL", "SLA"]}
          rows={rest.map((d) => [d.member, d.reason, d.pool, d.slaRemaining])}
          footer=""
        />
        <p className="text-[14.5px] leading-relaxed text-text-dim mt-4">
          Dispute rate is 2.1% of handovers. Above 5% at any hub we stop opening pools there until
          we know why.
        </p>
      </div>
    </div>
  );
}
