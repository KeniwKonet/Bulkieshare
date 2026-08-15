import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/auth/dal";
import { listAreas } from "@/lib/domain/pools";

/**
 * Area resolver: a signed-in member's own area wins, otherwise the first live
 * area. A manual choice, once made, lives in the URL and is never overridden.
 */
export default async function RootPage() {
  const [member, areas] = await Promise.all([getCurrentMember(), listAreas()]);

  const preferred = member?.areaSlug
    ? areas.find((a) => a.slug === member.areaSlug && a.isLive)
    : undefined;
  const fallback = areas.find((a) => a.isLive) ?? areas[0];

  redirect(`/${(preferred ?? fallback)?.slug ?? "abuja"}`);
}
