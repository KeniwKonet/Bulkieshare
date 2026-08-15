import { NotificationsForm } from "@/components/forms";
import { PhoneShell } from "@/components/nav";
import { requireMember } from "@/lib/auth/dal";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const member = await requireMember("/account/notifications");

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Notifications" eyebrow="PREFERENCE CENTRE">
        <div className="px-5 py-5">
          <p className="text-[15px] leading-relaxed text-text-dim mb-5">
            Financial and transactional messages cannot be switched off — they are how you find out
            your money moved.
          </p>

          <div className="flex justify-between items-center py-3 border-b border-rule">
            <div>
              <div className="text-[15px] font-semibold">Payments and refunds</div>
              <div className="text-[13px] text-text-dim">cannot be switched off</div>
            </div>
            <span className="font-mono text-[11.5px] bg-ink text-lime px-2 py-1 whitespace-nowrap">
              ALWAYS ON
            </span>
          </div>

          <NotificationsForm
            whatsapp={member.notifyWhatsapp}
            sms={member.notifySms}
            poolOpen={member.notifyPoolOpen}
          />
        </div>
      </PhoneShell>
    </div>
  );
}
