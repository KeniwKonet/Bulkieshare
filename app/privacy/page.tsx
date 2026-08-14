import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy and your data"
      updated="12 AUG 2026"
      sections={[
        {
          heading: "What we collect",
          body: [
            "Your phone number, the names and phone numbers of anyone you name as a beneficiary, payment records, and a log of pools you have joined and collections you have made.",
          ],
        },
        {
          heading: "Why we collect it",
          body: [
            "To match your payments to your reservations, to send collection codes to the right person, and to run the refund and dispute processes described in the pool policy.",
          ],
        },
        {
          heading: "Who can see it",
          body: [
            "Support staff and hub agents access member records to resolve payments, collections and disputes. Every view of a member's personal data by staff is logged against that staff member's name.",
          ],
        },
        {
          heading: "Your rights under the NDPA",
          body: [
            "You can request a copy of your data or ask us to delete your account from Account → Download my data or Account → Delete my account. Requests are tracked as a ticket and completed within the statutory window.",
          ],
        },
      ]}
    />
  );
}
