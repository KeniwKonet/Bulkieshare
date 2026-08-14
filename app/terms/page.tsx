import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of service"
      updated="12 AUG 2026"
      sections={[
        {
          heading: "What BulkieShare is",
          body: [
            "BulkieShare operates group-buying pools for bulk food. You pay for a slot in a pool; the pool proceeds only once it passes its published threshold. There is no delivery in phase 0 — you collect your portion at a hub named on the pool at the time you pay.",
          ],
        },
        {
          heading: "Payment and reservation",
          body: [
            "Reserving a slot holds it for 20 minutes while you transfer payment. A payment that lands late is re-reserved automatically if slots remain, or converted to store credit. A short payment is held as credit for the shortfall. A duplicate payment becomes credit the same day.",
          ],
        },
        {
          heading: "Refunds",
          body: [
            "If a pool does not reach its threshold by closing time, it is cancelled and every payer is refunded in full to the account they paid from, within 24 hours. Refunds are never split between named beneficiaries — they return to whoever made the payment.",
          ],
        },
        {
          heading: "Collection",
          body: [
            "Reserving a slot is confirmation that you, or the person you name, can reach the stated hub on the stated share date. BulkieShare does not deliver in phase 0. A missed collection window does not entitle you to a refund unless arranged with support in advance.",
          ],
        },
        {
          heading: "Not an investment",
          body: [
            "You are buying food at a lower price than retail. There is no return, no interest, and no financial scheme of any kind attached to your payment or any store credit balance.",
          ],
        },
      ]}
    />
  );
}
