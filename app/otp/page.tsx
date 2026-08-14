import { Logo, Btn } from "@/components/ui";
import { OtpInput } from "@/components/interactive";

export const metadata = { title: "Enter your code" };

export default function OtpPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-5 py-10">
      <div className="max-w-[420px] w-full border border-ink bg-card p-6 sm:p-7">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight leading-tight mb-2.5">
          Enter the six digit code
        </h1>
        <p className="text-[15.5px] leading-relaxed text-text-dim mb-1">
          Sent to +234 803 441 9022 on WhatsApp.
        </p>
        <div className="font-mono text-[11.5px] text-text-dim mb-3 mt-4">CODE SENT · 05:42 TO RESEND</div>
        <div className="mb-4">
          <OtpInput />
        </div>
        <div className="flex gap-2 mb-6">
          <Btn href="/otp" variant="outline" size="md" block>
            Send by SMS instead
          </Btn>
          <Btn href="/join" variant="outline" size="md" block>
            Wrong number
          </Btn>
        </div>
        <Btn href="/my-pools" variant="dark" block size="xl">
          Continue
        </Btn>
        <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-5 border-t border-rule pt-4">
          If WhatsApp does not deliver in 60 seconds we send an SMS automatically. Three wrong
          codes locks the number for 15 minutes.
        </p>
      </div>
    </div>
  );
}
