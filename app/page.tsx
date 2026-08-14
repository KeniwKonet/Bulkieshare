import { redirect } from "next/navigation";
import { DEFAULT_AREA } from "@/lib/mock-data";

// Area resolver: manual choice beats profile beats IP beats default,
// and a manual choice is never silently overridden. In this static build
// we always land on the default service area.
export default function RootPage() {
  redirect(`/${DEFAULT_AREA}`);
}
