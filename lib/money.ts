/**
 * All amounts in the database are integer kobo. These helpers are the only
 * place naira appears, so a display bug can never become a rounding bug in a
 * ledger. Function names always state the unit they take.
 */

export const KOBO_PER_NAIRA = 100;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}

export function koboToNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
}

/** "₦8,400" — whole naira, which is how every price in the product is quoted. */
export function formatKobo(kobo: number): string {
  const naira = Math.round(kobo / KOBO_PER_NAIRA);
  return "₦" + naira.toLocaleString("en-NG");
}

/** Signed form for ledger rows: "+₦740" / "−₦500". */
export function formatKoboSigned(kobo: number): string {
  const sign = kobo < 0 ? "−" : "+";
  return sign + formatKobo(Math.abs(kobo));
}

export function formatSlots(n: number): string {
  return `${n} slot${n === 1 ? "" : "s"}`;
}

export function slotsLeftLabel(n: number): string {
  return `${formatSlots(n)} left`;
}

/** Basis points to a one-decimal percent string, e.g. 440 -> "4.4%". */
export function formatBasisPoints(bp: number): string {
  return (bp / 100).toFixed(1) + "%";
}

export function formatKg(grams: number): string {
  return (grams / 1000).toFixed(2) + "kg";
}
