import Link from "next/link";
import type { ReactNode } from "react";

import { getCurrentMember } from "@/lib/auth/dal";
import { getArea } from "@/lib/domain/pools";
import { getOpsCounts } from "@/lib/domain/ops";
import { getSupplier } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { signOut } from "@/app/actions/auth";
import { Logo } from "./ui";

/* ---------------------------------------------------------------------- */
/* Public site                                                             */
/* ---------------------------------------------------------------------- */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export async function SiteHeader({ area }: { area?: string }) {
  const [member, areaRow] = await Promise.all([
    getCurrentMember(),
    area ? getArea(area) : Promise.resolve(null),
  ]);

  return (
    <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-ink flex-wrap gap-3">
      <div className="flex items-center gap-6 sm:gap-7 flex-wrap">
        <Link href={area ? `/${area}` : "/"}>
          <Logo />
        </Link>
        <nav className="hidden md:flex gap-5 text-[14.5px] font-medium">
          <Link href={area ? `/${area}/pools` : "/abuja/pools"}>Open pools</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href={area ? `/${area}/hubs` : "/abuja/hubs"}>Hubs</Link>
          <Link href="/trust">Refund promise</Link>
          <Link href="/groups">For groups</Link>
        </nav>
      </div>
      <div className="flex gap-2.5 items-center">
        {areaRow && (
          <span className="font-mono text-[12.5px] border border-ink px-2.5 py-1.5">
            {areaRow.label.toUpperCase()}
          </span>
        )}
        {member ? (
          <>
            <Link href="/my-pools" className="text-[14px] font-semibold hidden sm:inline">
              My pools
            </Link>
            <Link
              href="/account"
              className="w-[30px] h-[30px] bg-ink text-paper flex items-center justify-center text-[13px] font-bold"
              title={member.name || member.phone}
            >
              {initials(member.name || "")}
            </Link>
          </>
        ) : (
          <>
            <Link href="/join" className="text-[14px] font-semibold hidden sm:inline">
              Sign in
            </Link>
            <Link
              href={area ? `/join?next=/${area}/pools` : "/join"}
              className="bg-ink text-paper text-[14px] font-semibold px-4 py-2.5"
            >
              Join a pool
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <div className="px-5 sm:px-8 py-9 bg-ink text-paper grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-lime" />
          <span className="font-display text-[16px]">BulkieShare</span>
        </div>
        <p className="text-[14.5px] leading-relaxed text-dark-dim max-w-[44ch] mb-3">
          Registered in Nigeria. Members&apos; money is held in a separate account at a licensed
          bank and is never used to run the company.
        </p>
        <p className="font-mono text-[11.5px] text-dark-dim-2 leading-relaxed">
          We sell food, not investments. We never promise a financial return.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-[14.5px]">
        <span className="font-mono text-[11.5px] text-dark-dim-2">BUYING</span>
        <Link href="/abuja/pools">Open pools</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/abuja/hubs">Hubs and windows</Link>
        <Link href="/trust">Refund promise</Link>
        <Link href="/help">Help on WhatsApp</Link>
      </div>
      <div className="flex flex-col gap-2 text-[14.5px]">
        <span className="font-mono text-[11.5px] text-dark-dim-2">COMPANY</span>
        <Link href="/groups">For cooperatives</Link>
        <Link href="/supply">For suppliers</Link>
        <Link href="/pool-policy">Pool policy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy and your data</Link>
      </div>
    </div>
  );
}

export function SitePage({ area, children }: { area?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <SiteHeader area={area} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Member app                                                              */
/* ---------------------------------------------------------------------- */

export async function AppHeader({
  active,
  crumb,
}: {
  active?: "browse" | "my-pools" | "collections" | "credit";
  crumb?: string;
}) {
  const member = await getCurrentMember();
  const area = member?.areaSlug ?? "abuja";
  const linkCls = (key: string) => (active === key ? "border-b-2 border-ink pb-0.5" : "");

  return (
    <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-ink flex-wrap gap-3">
      <div className="flex items-center gap-6 sm:gap-7 flex-wrap">
        <Link href={`/${area}/pools`}>
          <Logo />
        </Link>
        {crumb ? (
          <span className="font-mono text-[12.5px]">{crumb}</span>
        ) : (
          <nav className="hidden md:flex gap-5 text-[14.5px] font-medium">
            <Link href={`/${area}/pools`} className={linkCls("browse")}>
              Open pools
            </Link>
            <Link href="/my-pools" className={linkCls("my-pools")}>
              My pools
            </Link>
            <Link href="/account/credit" className={linkCls("credit")}>
              Credit
            </Link>
          </nav>
        )}
      </div>
      <div className="flex gap-2.5 items-center">
        <span className="font-mono text-[12.5px] border border-ink px-2.5 py-1.5 hidden sm:inline">
          {area.toUpperCase()}
        </span>
        {member && member.creditKobo !== 0 && (
          <span className="font-mono text-[12.5px] bg-ink text-lime px-2.5 py-1.5">
            CREDIT {formatKobo(member.creditKobo)}
          </span>
        )}
        {member ? (
          <Link
            href="/account"
            className="w-[30px] h-[30px] bg-ink text-paper flex items-center justify-center text-[13px] font-bold"
            title={member.name || member.phone}
          >
            {initials(member.name || "")}
          </Link>
        ) : (
          <Link href="/join" className="text-[14px] font-semibold">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

/** Narrow, phone-oriented shell used for the mobile member/hub-agent screens. */
export function PhoneShell({
  title,
  eyebrow,
  dark = false,
  children,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`max-w-[460px] mx-auto min-h-screen flex flex-col border-x ${
        dark ? "bg-ink text-paper border-dark-rule" : "bg-paper text-ink border-ink"
      }`}
    >
      {(title || eyebrow) && (
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            dark ? "border-dark-rule" : "border-ink"
          }`}
        >
          <span className="font-display text-[15px]">{title}</span>
          <span className="font-mono text-[11.5px]">{eyebrow}</span>
        </div>
      )}
      {children}
    </div>
  );
}

/** Sign-out is a mutation, so it is a form post rather than a link. */
export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Coordinator                                                             */
/* ---------------------------------------------------------------------- */

export function GroupsShell({
  org,
  orgName,
  active,
  rosterPoolId,
  sideExtra,
  children,
}: {
  org: string;
  orgName: string;
  active: "overview" | "roster" | "new" | "members" | "fees";
  rosterPoolId?: string | null;
  sideExtra?: ReactNode;
  children: ReactNode;
}) {
  const item = (key: string, label: string, href: string) => (
    <Link
      href={href}
      className={active === key ? "font-bold bg-lime px-2.5 py-1.5 -mx-2.5" : "font-medium"}
    >
      {label}
    </Link>
  );
  return (
    <div className="min-h-screen bg-paper text-ink grid grid-cols-1 lg:grid-cols-[230px_1fr]">
      <div className="border-b lg:border-b-0 lg:border-r border-ink px-4.5 py-5 flex flex-col gap-5">
        <Link href="/groups">
          <Logo size={16} />
        </Link>
        <div className="border border-ink bg-card p-3">
          <div className="font-mono text-[11px] text-text-dim">COORDINATING FOR</div>
          <div className="text-[15px] font-bold leading-snug">{orgName}</div>
        </div>
        <div className="flex flex-col gap-2.5 text-[15px]">
          {item("overview", "Overview", `/groups/${org}`)}
          {rosterPoolId && item("roster", "Live roster", `/groups/${org}/pools/${rosterPoolId}`)}
          {item("new", "Open a pool", `/groups/${org}/pools/new`)}
          {item("members", "Members", `/groups/${org}/members`)}
          {item("fees", "My fees", `/groups/${org}/fees`)}
        </div>
        {sideExtra}
        <SignOutButton className="font-mono text-[11.5px] text-text-dim text-left mt-auto" />
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Supplier                                                                 */
/* ---------------------------------------------------------------------- */

export async function SupplyHeader({
  active,
}: {
  active: "orders" | "requests" | "payouts" | "score";
}) {
  const member = await getCurrentMember();
  const supplier = member?.supplierId ? await getSupplier(member.supplierId) : null;
  const cls = (key: string) => (active === key ? "font-semibold border-b-2 border-ink pb-0.5" : "");

  return (
    <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-ink flex-wrap gap-3">
      <div className="flex gap-5 sm:gap-6 items-center text-[14.5px] flex-wrap">
        <span className="font-bold">{supplier?.name ?? "Supplier"}</span>
        <Link href="/supply/orders" className={cls("orders")}>
          Orders
        </Link>
        <Link href="/supply/requests" className={cls("requests")}>
          Quote requests
        </Link>
        <Link href="/supply/payouts" className={cls("payouts")}>
          Payouts
        </Link>
        <Link href="/supply/scorecard" className={cls("score")}>
          My score
        </Link>
      </div>
      <span className="font-mono text-[12px] bg-ink text-lime px-2.5 py-1.5">
        {supplier?.isApproved ? "KYC VERIFIED · STANDARD SIGNED" : "ONBOARDING IN REVIEW"}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Ops back office                                                         */
/* ---------------------------------------------------------------------- */

export async function OpsHeader({
  active,
}: {
  active:
    | "pools"
    | "payments"
    | "refunds"
    | "intake"
    | "disputes"
    | "reconciliation"
    | "members"
    | "suppliers"
    | "groups"
    | "hubs"
    | "areas"
    | "audit";
}) {
  const [member, counts] = await Promise.all([getCurrentMember(), getOpsCounts()]);
  const cls = (key: string) => (active === key ? "text-lime" : "");

  return (
    <div className="flex items-center justify-between px-5 sm:px-6 py-3 bg-ink text-paper flex-wrap gap-3">
      <div className="flex gap-4 sm:gap-5 items-center font-mono text-[12.5px] flex-wrap">
        <span className="font-semibold">OPS</span>
        <Link href="/admin/pools" className={cls("pools")}>
          Pools
        </Link>
        <Link href="/admin/payments/unmatched" className={cls("payments")}>
          Payments
        </Link>
        <Link href="/admin/refunds" className={cls("refunds")}>
          Refunds
        </Link>
        <Link href="/admin/suppliers" className={cls("suppliers")}>
          Suppliers
        </Link>
        <Link href="/admin/groups" className={cls("groups")}>
          Co-ops
        </Link>
        <Link href="/admin/disputes" className={cls("disputes")}>
          Disputes
        </Link>
        <Link href="/admin/reconciliation" className={cls("reconciliation")}>
          Reconciliation
        </Link>
        <Link href="/admin/members" className={cls("members")}>
          Members
        </Link>
        <Link href="/admin/hubs" className={cls("hubs")}>
          Hubs
        </Link>
        <Link href="/admin/areas" className={cls("areas")}>
          Areas
        </Link>
        <Link href="/admin/audit" className={cls("audit")}>
          Audit
        </Link>
      </div>
      <div className="hidden lg:flex gap-4 font-mono text-[12.5px] items-center">
        {counts.breachingDisputes > 0 && (
          <span className="text-rust">{counts.breachingDisputes} disputes breaching</span>
        )}
        {counts.unmatched > 0 && (
          <span className="text-amber">{counts.unmatched} unmatched transfers</span>
        )}
        <span>{member?.name?.toUpperCase() ?? "OPS"}</span>
        <SignOutButton className="text-dark-dim-2" />
      </div>
    </div>
  );
}
