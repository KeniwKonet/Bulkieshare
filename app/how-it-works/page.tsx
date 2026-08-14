import { SitePage } from "@/components/nav";
import { Btn } from "@/components/ui";

export const metadata = { title: "How it works" };

const STEPS = [
  {
    n: "01",
    title: "Find a pool at a hub you can reach",
    body: "Each pool names one hub and one share date. Check you can be there before you pay, because this is collection, not delivery.",
  },
  {
    n: "02",
    title: "Pay for your slot in full",
    body: "One bank transfer to an account that belongs to you. No instalments, no card stored, no credit. You have 20 minutes from reserving.",
  },
  {
    n: "03",
    title: "Wait for the pool to fill",
    body: "We buy nothing until enough people have joined. You can name other people to collect your slots, and change those names until the pool locks.",
  },
  {
    n: "04",
    title: "Collect in your booked window",
    body: "Read your code, watch your portion weighed, take it home. Twenty minute windows so nobody queues behind forty people.",
  },
];

const FAQS = [
  {
    q: "What if it does not fill?",
    a: "Nothing is bought and everyone is refunded in full, to the account they paid from, within 24 hours. Every pool shows the number it needs and how far off it is.",
  },
  {
    q: "What if my portion is small?",
    a: "Meat pools publish a tolerance band, usually ±8%. Come in under it and we credit you the difference automatically, before you leave the hub. You do not have to complain first.",
  },
  {
    q: "Can I send someone else?",
    a: "Yes, and most people do. Name them and they get their own code and their own message. Refunds still go back to whoever paid.",
  },
];

export default function HowItWorksPage() {
  return (
    <SitePage>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-9">
        <h1 className="font-display text-[38px] sm:text-[46px] tracking-tight leading-none mb-4">
          How it works, including the parts that go wrong
        </h1>
        <p className="text-[16px] leading-relaxed text-text-mid mb-8">
          Four steps, then the three situations people actually worry about.
        </p>
        <div className="flex flex-col gap-5 mb-10">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-4">
              <div className="font-display text-[30px] text-text-faint leading-none w-[46px] flex-shrink-0">
                {s.n}
              </div>
              <div>
                <div className="text-[19px] font-bold mb-1">{s.title}</div>
                <p className="text-[15px] leading-relaxed text-text-dim">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-ink pt-7">
          <h2 className="font-display text-[26px] tracking-tight mb-4">The three things people ask</h2>
          <div className="flex flex-col gap-4 mb-8">
            {FAQS.map((f) => (
              <div key={f.q}>
                <div className="text-[17px] font-bold mb-1">{f.q}</div>
                <p className="text-[15px] leading-relaxed text-text-dim">{f.a}</p>
              </div>
            ))}
          </div>
          <Btn href="/abuja/pools" size="lg">
            Join a pool
          </Btn>
        </div>
      </div>
    </SitePage>
  );
}
