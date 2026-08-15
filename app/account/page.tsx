import Link from "next/link";

import { ProfileForm } from "@/components/forms";
import { PhoneShell, SignOutButton } from "@/components/nav";
import { requireMember } from "@/lib/auth/dal";
import { getArea, listHubs } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const member = await requireMember("/account");

  const [hubs, area] = await Promise.all([
    listHubs(member.areaSlug ?? undefined),
    member.areaSlug ? getArea(member.areaSlug) : Promise.resolve(null),
  ]);

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Account" eyebrow={(member.name || formatPhone(member.phone)).toUpperCase()}>
        {welcome && (
          <div className="px-5 py-4 bg-lime border-b border-ink">
            <div className="font-display text-[20px] tracking-tight mb-1">
              Welcome to BulkieShare
            </div>
            <p className="text-[14.5px] leading-snug">
              Add your name so the hub agent can call it out on share day.
            </p>
          </div>
        )}

        <div className="px-5 py-5 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">YOU</div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule">
            <span className="text-text-dim">Phone</span>
            <span className="font-mono">{formatPhone(member.phone)}</span>
          </div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule">
            <span className="text-text-dim">Area</span>
            <span className="font-semibold">{area?.label ?? "—"}</span>
          </div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule">
            <span className="text-text-dim">Store credit</span>
            <span className="font-mono font-semibold">{formatKobo(member.creditKobo)}</span>
          </div>
          <div className="flex justify-between text-[15px] py-2">
            <span className="text-text-dim">Role</span>
            <span className="font-semibold">{member.role.replace("_", " ")}</span>
          </div>
        </div>

        <div className="px-5 py-5 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">YOUR DETAILS</div>
          <ProfileForm
            defaultName={member.name}
            defaultHubId={member.homeHubId}
            hubs={hubs.map((h) => ({ id: h.id, name: h.name }))}
          />
        </div>

        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">MORE</div>
          <div className="flex flex-col gap-2.5 text-[15px]">
            <Link href="/account/credit" className="font-semibold border-b border-ink w-fit">
              Store credit and movements
            </Link>
            <Link href="/account/notifications" className="font-semibold border-b border-ink w-fit">
              Notification settings
            </Link>
            <Link href="/account/data" className="font-semibold border-b border-ink w-fit">
              Download my data
            </Link>
            {member.role === "hub_agent" && (
              <Link href="/hub" className="font-semibold border-b border-ink w-fit">
                Hub agent tools
              </Link>
            )}
            {member.role === "supplier" && (
              <Link href="/supply/orders" className="font-semibold border-b border-ink w-fit">
                Supplier portal
              </Link>
            )}
            {(member.role === "ops" || member.role === "admin") && (
              <Link href="/admin/pools" className="font-semibold border-b border-ink w-fit">
                Ops back office
              </Link>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-rule">
            <SignOutButton className="border border-ink text-[14px] font-semibold px-4 py-3 w-full" />
          </div>
        </div>
      </PhoneShell>
    </div>
  );
}
