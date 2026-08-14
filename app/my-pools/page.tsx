import Link from "next/link";
import { AppHeader } from "@/components/nav";
import { Btn, PoolProgress, Tag } from "@/components/ui";
import { formatNaira, getPool } from "@/lib/mock-data";

export const metadata = { title: "My pools" };

const COMMITMENTS = [
  { id: "a-2214-r1", pool: getPool("a-2214"), state: "filling" as const, slots: 2 },
  { id: "a-2190-r1", pool: getPool("a-2190"), state: "ready" as const, slots: 1 },
  { id: "a-2185-r1", pool: getPool("a-2185"), state: "completed" as const, slots: 1 },
  { id: "a-2226-r1", pool: getPool("a-2226"), state: "refunding" as const, slots: 1 },
];

const STATE_LABEL: Record<string, { label: string; tone: "lime" | "amber" | "green" | "rust" }> = {
  filling: { label: "filling", tone: "amber" },
  funded: { label: "funded", tone: "lime" },
  ready: { label: "ready to collect", tone: "green" },
  completed: { label: "completed", tone: "lime" },
  refunding: { label: "refunding", tone: "rust" },
};

export default async function MyPoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;

  if (empty) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <AppHeader crumb="MY POOLS" />
        <div className="max-w-xl mx-auto px-5 sm:px-8 py-10">
          <h1 className="font-display text-[30px] tracking-tight leading-tight mb-2.5">
            You have not joined a pool yet
          </h1>
          <p className="text-[15.5px] leading-relaxed text-text-mid mb-5">
            Two pools close this week. The rice pool needs two more people to go ahead, so
            joining it does something visible today.
          </p>
          <Btn href="/abuja/pools" block size="lg" className="mb-8">
            Browse open pools
          </Btn>
          <div className="font-mono text-[11.5px] text-text-dim mb-3">CHEAPEST WAY IN</div>
          <div className="border border-ink bg-card p-4 mb-3">
            <div className="font-mono text-[11.5px] mb-1">#A-2244 · WUSE HUB · SAT 23 AUG</div>
            <div className="font-display text-[21px]">Palm oil, 5 litres</div>
            <div className="flex justify-between items-end mt-2.5">
              <span className="font-display text-[24px]">{formatNaira(9200)}</span>
              <Btn href="/abuja/pools/a-2244" variant="outline" size="sm">
                Look at it
              </Btn>
            </div>
          </div>
          <p className="text-[14.5px] text-text-dim leading-relaxed">
            Nothing here is a subscription. Join one pool, collect once, decide then.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader active="my-pools" credit={1940} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[32px] sm:text-[38px] tracking-tight mb-1">My pools</h1>
        <p className="text-[15px] text-text-dim mb-6">
          <Link href="/my-pools?empty=1" className="underline">
            See the first-time empty state
          </Link>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMMITMENTS.map((c) => {
            const s = STATE_LABEL[c.state];
            return (
              <Link
                key={c.id}
                href={`/commitments/${c.id}`}
                className="border border-ink bg-card p-5 block"
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="font-mono text-[11.5px] text-text-dim mb-1">
                      #{c.pool.code} · {c.pool.hubName.toUpperCase()}
                    </div>
                    <div className="font-display text-[22px] tracking-tight">{c.pool.title}</div>
                  </div>
                  <Tag tone={s.tone}>{s.label.toUpperCase()}</Tag>
                </div>
                <PoolProgress pool={c.pool} height={10} showCaption={false} />
                <div className="flex justify-between text-[14px] text-text-dim mt-3">
                  <span>
                    {c.slots} slot{c.slots > 1 ? "s" : ""}
                  </span>
                  <span>{c.pool.shareDate}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
