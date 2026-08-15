"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { endSession, getCurrentMember, linkAuthUser, startSession } from "@/lib/auth/dal";
import { otpIsMocked, requestOtp, verifyOtp } from "@/lib/auth/otp";
import * as supabaseOtp from "@/lib/auth/supabase-otp";
import { writeTokens } from "@/lib/auth/supabase-session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { InvalidPhoneError, normalisePhone } from "@/lib/phone";
import { joinWaitlist } from "@/lib/domain/ops";
import { fail, succeed, type FormState } from "./_state";

/**
 * Sign-in is phone plus a six digit code. The number being verified is kept in
 * a short-lived cookie rather than the URL, so it cannot be swapped between
 * requesting a code and entering one.
 */

const PHONE_COOKIE = "bs_otp_phone";
const PHONE_COOKIE_MAX_AGE = 15 * 60;

export async function requestCode(_state: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("phone") ?? "");
  const channel = formData.get("channel") === "sms" ? "sms" : "whatsapp";

  let phone: string;
  try {
    phone = normalisePhone(raw);
  } catch (err) {
    if (err instanceof InvalidPhoneError) return fail(err.message, { phone: err.message });
    throw err;
  }

  // Supabase Auth owns sign-in when the project has phone enabled. The local
  // OTP path below is the fallback while that is still switched off.
  if (await supabaseOtp.available()) {
    const sent = await supabaseOtp.requestOtp(phone);
    if (!sent.ok) return fail(sent.error);
  } else {
    const result = await requestOtp(phone, channel);
    if (!result.ok) return fail(result.error);
  }

  const store = await cookies();
  store.set(PHONE_COOKIE, phone, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PHONE_COOKIE_MAX_AGE,
  });

  const next = String(formData.get("next") ?? "");
  redirect(next ? `/otp?next=${encodeURIComponent(next)}` : "/otp");
}

export async function resendCode(_state: FormState, formData: FormData): Promise<FormState> {
  const store = await cookies();
  const phone = store.get(PHONE_COOKIE)?.value;
  if (!phone) return fail("Start again with your phone number.");

  if (await supabaseOtp.available()) {
    const sent = await supabaseOtp.requestOtp(phone);
    if (!sent.ok) return fail(sent.error);
    return succeed("Code sent again.");
  }

  const channel = formData.get("channel") === "sms" ? "sms" : "whatsapp";
  const result = await requestOtp(phone, channel);
  if (!result.ok) return fail(result.error);

  return succeed(
    channel === "sms" ? "Code sent by SMS." : "Code sent on WhatsApp.",
    otpIsMocked() ? result.mockCode : undefined,
  );
}

export async function verifyCode(_state: FormState, formData: FormData): Promise<FormState> {
  const store = await cookies();
  const phone = store.get(PHONE_COOKIE)?.value;
  if (!phone) return fail("That took too long. Enter your number again.");

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return fail("Enter all six digits.");

  let isNewMember: boolean;

  if (await supabaseOtp.available()) {
    const verified = await supabaseOtp.verifyOtp(phone, code);
    if (!verified.ok) return fail(verified.error);

    // Supabase issued the session; store its tokens and link the auth user to
    // this app's member record.
    await writeTokens(verified.tokens);
    ({ isNewMember } = await linkAuthUser({
      authUserId: verified.authUserId,
      phone: verified.phone,
    }));
  } else {
    const result = await verifyOtp(phone, code);
    if (!result.ok) return fail(result.error);
    await startSession(result.memberId);
    isNewMember = result.isNewMember;
  }

  store.delete(PHONE_COOKIE);

  const next = String(formData.get("next") ?? "");
  // A brand new member has no name yet, so send them to set one up.
  redirect(isNewMember ? "/account?welcome=1" : next || "/my-pools");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

/* ---------------------------------------------------------------------- */
/* Profile                                                                 */
/* ---------------------------------------------------------------------- */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Give us a name we can call out at the hub."),
  homeHubId: z.string().trim().optional(),
});

export async function updateProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!member) return fail("Sign in to update your details.");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    homeHubId: formData.get("homeHubId") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first.message, { [String(first.path[0])]: first.message });
  }

  const db = await getDb();
  await db
    .update(s.members)
    .set({
      name: parsed.data.name,
      homeHubId: parsed.data.homeHubId || null,
    })
    .where(eq(s.members.id, member.id));

  refresh();
  return succeed("Saved.");
}

export async function updateNotifications(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const member = await getCurrentMember();
  if (!member) return fail("Sign in to change your notifications.");

  const db = await getDb();
  await db
    .update(s.members)
    .set({
      notifyWhatsapp: formData.get("notifyWhatsapp") === "on",
      notifySms: formData.get("notifySms") === "on",
      notifyPoolOpen: formData.get("notifyPoolOpen") === "on",
    })
    .where(eq(s.members.id, member.id));

  refresh();
  return succeed("Notification settings saved.");
}

/* ---------------------------------------------------------------------- */
/* Waitlist for areas that are not live                                    */
/* ---------------------------------------------------------------------- */

export async function joinAreaWaitlist(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const areaSlug = String(formData.get("area") ?? "");
  const neighbourhood = String(formData.get("neighbourhood") ?? "").trim();

  let phone: string;
  try {
    phone = normalisePhone(String(formData.get("phone") ?? ""));
  } catch (err) {
    if (err instanceof InvalidPhoneError) return fail(err.message, { phone: err.message });
    throw err;
  }

  await joinWaitlist(phone, areaSlug, neighbourhood);
  return succeed("You are on the list. We will message you when we open here.");
}
