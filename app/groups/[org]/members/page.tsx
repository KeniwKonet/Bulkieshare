import { GroupsShell } from "@/components/nav";
import { Btn, GridTable } from "@/components/ui";

export const metadata = { title: "Members" };

const MEMBERS = [
  { name: "Hauwa Ibrahim", phone: "0705 332 8841", pools: 4, onApp: true },
  { name: "Ngozi Eze", phone: "0906 118 2043", pools: 4, onApp: true },
  { name: "Blessing Okon", phone: "0813 774 0091", pools: 2, onApp: false },
  { name: "Fatima Sani", phone: "0802 445 1187", pools: 1, onApp: false },
  { name: "Amina Yusuf", phone: "0909 220 6614", pools: 3, onApp: true },
];

export default async function MembersPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  return (
    <GroupsShell org={org} orgName="Gwarinpa Women's Cooperative" active="members">
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-[26px] tracking-tight">Members · 31</h1>
          <Btn variant="outline" size="sm">
            Import from WhatsApp
          </Btn>
        </div>
        <p className="text-[15px] leading-relaxed text-text-dim mb-5">
          Names and numbers only. You cannot see what anyone paid outside your pools, and they
          can leave the group without asking you.
        </p>
        <GridTable
          columns="1.4fr 1.1fr .8fr .7fr"
          headers={["NAME", "PHONE", "POOLS", "ON APP"]}
          rows={MEMBERS.map((m) => [
            m.name,
            m.phone,
            String(m.pools),
            <span key="a" className={m.onApp ? "text-green" : "text-text-dim"}>
              {m.onApp ? "yes" : "no"}
            </span>,
          ])}
          footer="26 more · 19 of 31 have the app"
        />
        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-3.5">
          The twelve without the app still get WhatsApp messages and their own collection codes.
          Nobody is forced to install anything.
        </p>
      </div>
    </GroupsShell>
  );
}
