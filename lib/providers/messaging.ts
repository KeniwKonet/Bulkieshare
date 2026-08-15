import "server-only";

import { devMocksAllowed, env } from "../env";

/**
 * Outbound WhatsApp and SMS.
 *
 * The product promises: OTP goes out on WhatsApp first, and if it has not
 * landed in 60 seconds an SMS follows. Termii serves both channels.
 *
 * With no `TERMII_API_KEY` the mock records the message and logs it, which is
 * what makes sign-in work locally without a provider account.
 */

export type Channel = "whatsapp" | "sms";

export interface SendResult {
  ok: boolean;
  channel: Channel;
  providerId?: string;
  error?: string;
  /**
   * Only ever set by the mock. Lets the dev sign-in screen show the code
   * instead of making you dig through server logs.
   */
  mockCode?: string;
}

export interface Messenger {
  send(input: { to: string; body: string; channel: Channel; code?: string }): Promise<SendResult>;
}

/** Records sends in memory so the dev OTP screen can read the last code back. */
const mockOutbox: { to: string; body: string; channel: Channel; code?: string; at: Date }[] = [];

export function readMockOutbox(phone: string) {
  return mockOutbox.filter((m) => m.to === phone).at(-1);
}

const mockMessenger: Messenger = {
  async send({ to, body, channel, code }) {
    // In production a missing Termii key means nothing was sent. Reporting
    // success would strand the member on a code screen waiting for a message
    // that is never coming, and returning `mockCode` would print the code on
    // screen for anyone who typed in a phone number.
    if (!devMocksAllowed()) {
      return { ok: false, channel, error: "Sign-in messaging is not configured." };
    }

    mockOutbox.push({ to, body, channel, code, at: new Date() });
    if (mockOutbox.length > 200) mockOutbox.shift();
    console.info(`[messaging:mock] ${channel} → ${to}: ${body}`);
    return { ok: true, channel, providerId: `mock_${Date.now()}`, mockCode: code };
  },
};

const termiiMessenger: Messenger = {
  async send({ to, body, channel }) {
    try {
      const res = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: env.termii.apiKey,
          to: to.replace(/^\+/, ""),
          from: env.termii.senderId,
          sms: body,
          type: "plain",
          channel: channel === "whatsapp" ? "whatsapp" : "generic",
        }),
      });

      const json = (await res.json()) as { message_id?: string; message?: string };
      if (!res.ok) {
        return { ok: false, channel, error: json.message ?? `Termii ${res.status}` };
      }
      return { ok: true, channel, providerId: json.message_id };
    } catch (err) {
      return { ok: false, channel, error: err instanceof Error ? err.message : "send failed" };
    }
  },
};

export function getMessenger(): Messenger {
  return env.termii.configured ? termiiMessenger : mockMessenger;
}

export function messengerIsMock(): boolean {
  return !env.termii.configured;
}
