import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { devMocksAllowed, env } from "../env";
import { addMinutes } from "../time";

/**
 * Payments.
 *
 * Members pay by bank transfer, so the primitive is "give me an account number
 * to send to, then tell me when the money lands". Paystack's charge API with
 * `bank_transfer` returns exactly that, and its webhook closes the loop.
 *
 * With no `PAYSTACK_SECRET_KEY` the mock issues a fake NUBAN and the payment
 * screen grows a "I have sent it" button, which is how the flow completes
 * locally. That button is never rendered when a real key is present.
 */

export interface TransferInstruction {
  accountNumber: string;
  bankName: string;
  accountName: string;
  expiresAt: Date;
  providerReference: string;
}

export interface PaymentsProvider {
  readonly name: string;
  createTransferCharge(input: {
    reference: string;
    amountKobo: number;
    email: string;
    phone: string;
  }): Promise<{ ok: true; instruction: TransferInstruction } | { ok: false; error: string }>;

  verifyTransaction(
    reference: string,
  ): Promise<{ ok: true; paid: boolean; amountKobo: number } | { ok: false; error: string }>;
}

const HOLD_MINUTES = 20;

const mockProvider: PaymentsProvider = {
  name: "mock",

  async createTransferCharge({ reference }) {
    // Never hand out a fabricated account number on a real deployment: a member
    // would transfer money into nowhere.
    if (!devMocksAllowed()) {
      return { ok: false, error: "Payments are not configured. Nothing was charged." };
    }

    // Deterministic from the reference so a refresh shows the same account.
    const digits = reference.replace(/\D/g, "").padEnd(10, "7").slice(0, 10);
    return {
      ok: true,
      instruction: {
        accountNumber: digits,
        bankName: "Wema Bank",
        accountName: "BulkieShare / Pool escrow",
        expiresAt: addMinutes(new Date(), HOLD_MINUTES),
        providerReference: `mock_${reference}`,
      },
    };
  },

  async verifyTransaction() {
    // The mock has no external truth to check against; the payment screen's
    // confirm button is what advances a mock payment.
    return { ok: true, paid: false, amountKobo: 0 };
  },
};

const paystackProvider: PaymentsProvider = {
  name: "paystack",

  async createTransferCharge({ reference, amountKobo, email, phone }) {
    try {
      const res = await fetch("https://api.paystack.co/charge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.paystack.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          reference,
          bank_transfer: { account_expires_at: addMinutes(new Date(), HOLD_MINUTES).toISOString() },
          metadata: { phone },
        }),
      });

      const json = (await res.json()) as {
        status?: boolean;
        message?: string;
        data?: {
          account_name?: string;
          account_number?: string;
          bank?: { name?: string };
          account_expires_at?: string;
          reference?: string;
        };
      };

      if (!res.ok || !json.status || !json.data?.account_number) {
        return { ok: false, error: json.message ?? `Paystack ${res.status}` };
      }

      return {
        ok: true,
        instruction: {
          accountNumber: json.data.account_number,
          bankName: json.data.bank?.name ?? "Bank",
          accountName: json.data.account_name ?? "BulkieShare",
          expiresAt: json.data.account_expires_at
            ? new Date(json.data.account_expires_at)
            : addMinutes(new Date(), HOLD_MINUTES),
          providerReference: json.data.reference ?? reference,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "charge failed" };
    }
  },

  async verifyTransaction(reference) {
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${env.paystack.secretKey}` } },
      );
      const json = (await res.json()) as {
        status?: boolean;
        message?: string;
        data?: { status?: string; amount?: number };
      };
      if (!res.ok || !json.status) return { ok: false, error: json.message ?? "verify failed" };
      return {
        ok: true,
        paid: json.data?.status === "success",
        amountKobo: json.data?.amount ?? 0,
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "verify failed" };
    }
  },
};

export function getPaymentsProvider(): PaymentsProvider {
  return env.paystack.configured ? paystackProvider : mockProvider;
}

/**
 * Whether the "I have sent the transfer" shortcut may be shown and honoured.
 *
 * Gated on the environment as well as the key: on a public deployment that
 * button would let anyone claim a slot without paying for it.
 */
export function paymentsAreMocked(): boolean {
  return devMocksAllowed() && !env.paystack.configured;
}

/**
 * Paystack signs each webhook with HMAC SHA512 over the raw body using the
 * secret key. Compared in constant time; a mismatch means the request did not
 * come from Paystack and must be dropped.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!env.paystack.secretKey || !signature) return false;
  const expected = createHmac("sha512", env.paystack.secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const PAYMENT_HOLD_MINUTES = HOLD_MINUTES;
