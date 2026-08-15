import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { NewSupplierForm } from "@/components/staff-forms";
import { requireOps } from "@/lib/auth/dal";

export const metadata = { title: "Add a supplier" };

export default async function NewSupplierPage() {
  await requireOps();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="suppliers" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1">
          <Link href="/admin/suppliers" className="underline">
            SUPPLIERS
          </Link>{" "}
          / NEW
        </div>
        <h1 className="font-display text-[28px] tracking-tight mb-2">Add a supplier</h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-6 max-w-[62ch]">
          For a supplier a field agent met directly, rather than one who registered themselves.
          Everything except the business name can be filled in later, but nothing can be ordered
          from them until bank details are captured and they are approved.
        </p>

        <NewSupplierForm />
      </div>
    </div>
  );
}
