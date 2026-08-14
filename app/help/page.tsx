import { SitePage } from "@/components/nav";
import { Accordion } from "@/components/accordion";

export const metadata = { title: "Help" };

const FAQS = [
  {
    q: "I sent the money but my slots are gone",
    a: "This usually means your 20 minute hold expired before the transfer landed. If slots remain in the pool, we re-reserve them automatically the moment we match your payment. If the pool filled in the meantime, the payment becomes store credit and we message you immediately.",
  },
  {
    q: "Can I change who collects?",
    a: "Yes, until the pool locks, which is 24 hours before the share date. Open the pool, go to who collects, and edit the name and phone number. The new person gets their own code immediately and the old code stops working.",
  },
  {
    q: "What happens if I miss my collection window?",
    a: "Message us on WhatsApp before the hub closes for the day and we will try to fit you into a later window. After the hub closes, your portion is held for one more collection day before it is treated as a no-show.",
  },
  {
    q: "Why is the price different in Lagos?",
    a: "Prices are set per hub because haulage, hub rental and local supplier prices differ by city. What you see at your hub is exactly what you pay.",
  },
  {
    q: "Can I get my store credit as cash?",
    a: "Yes. Open Account, then Credit, and choose send to my bank. It arrives within 24 hours to an account in your own name.",
  },
  {
    q: "Is my portion halal?",
    a: "All our livestock and poultry suppliers are certified halal slaughter. The certificate is available on request from the hub agent at handover.",
  },
];

export default function HelpPage() {
  return (
    <SitePage>
      <div className="max-w-3xl mx-auto">
        <div className="px-5 sm:px-8 py-7 bg-lime flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center justify-between">
          <div>
            <div className="font-display text-[24px] tracking-tight mb-1">
              Message a person on WhatsApp
            </div>
            <p className="text-[14.5px] leading-relaxed max-w-[46ch]">
              A human answers, usually inside 20 minutes. There is no bot and no ticket number to
              memorise.
            </p>
          </div>
          <a
            href="https://wa.me/2348030000000"
            className="bg-ink text-paper text-[15px] font-bold px-5 py-3.5 whitespace-nowrap"
          >
            0803 000 0000
          </a>
        </div>
        <div className="px-5 sm:px-8 py-8">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">MOST ASKED THIS WEEK</div>
          <Accordion items={FAQS} />
        </div>
      </div>
    </SitePage>
  );
}
