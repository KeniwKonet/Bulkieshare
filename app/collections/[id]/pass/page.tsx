import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";
import { formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Collection pass" };

export default async function CollectionPassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Collection pass" eyebrow="WORKS OFFLINE">
        <div className="px-5 py-6 text-center border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-1">READ THIS TO THE AGENT</div>
          <div className="font-display text-[64px] sm:text-[72px] tracking-[.06em] leading-tight">4471</div>
          <div className="w-[130px] h-[130px] mx-auto mt-2 border-[6px] border-paper outline outline-1 outline-ink hatch-unpaid" />
        </div>
        <div className="px-5 py-5">
          <div className="font-display text-[22px] sm:text-[24px] tracking-tight leading-tight mb-3.5">
            Kuje hub
            <br />
            Saturday 16 Aug, 10:20 to 10:40
          </div>
          <div className="flex flex-col gap-2 text-[14.5px]">
            <div className="flex justify-between pb-2 border-b border-rule">
              <span className="text-text-dim">Pool</span>
              <span className="font-semibold">Cow, Kuje · #{id.split("-r")[0].toUpperCase()}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-rule">
              <span className="text-text-dim">Your portion</span>
              <span className="font-semibold">≈2.5kg mixed cuts</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-rule">
              <span className="text-text-dim">Paid</span>
              <span className="font-semibold font-mono">{formatNaira(8400)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-dim flex-shrink-0">Landmark</span>
              <span className="font-semibold text-right">
                Green gate opposite the mosque, Kuje market road
              </span>
            </div>
          </div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="text-[14px] leading-relaxed text-text-mid mb-3">
            Watch the scale. If your portion comes under 2.30kg the difference is credited to you
            before you leave.
          </p>
          <div className="flex gap-2">
            <Btn variant="outline" size="md" block>
              Get directions
            </Btn>
            <Btn href={`/collections/${id}/book`} variant="dark" size="md" block>
              Change my window
            </Btn>
          </div>
        </div>
      </PhoneShell>
    </div>
  );
}
