/**
 * Nigerian phone numbers are entered every way imaginable — "0803 441 9022",
 * "803 441 9022", "+234 803 441 9022", "234 803 441 9022". Everything is
 * normalised to E.164 (+234...) before it touches the database, so a member
 * cannot end up with two accounts by typing their number differently.
 */

const NG_CODE = "234";

export class InvalidPhoneError extends Error {
  constructor() {
    super("Enter a Nigerian mobile number, for example 0803 441 9022.");
    this.name = "InvalidPhoneError";
  }
}

export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  let local: string;
  if (digits.startsWith(NG_CODE) && digits.length === 13) {
    local = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 11) {
    local = digits.slice(1);
  } else if (digits.length === 10) {
    local = digits;
  } else {
    throw new InvalidPhoneError();
  }

  // Nigerian mobile prefixes are 70, 80, 81, 90, 91 followed by 8 digits.
  if (!/^(70|71|80|81|90|91)\d{8}$/.test(local)) throw new InvalidPhoneError();

  return `+${NG_CODE}${local}`;
}

export function isValidPhone(input: string): boolean {
  try {
    normalisePhone(input);
    return true;
  } catch {
    return false;
  }
}

/** "+2348034419022" → "0803 441 9022", the form people recognise. */
export function formatPhone(e164: string): string {
  const local = e164.replace(`+${NG_CODE}`, "");
  if (local.length !== 10) return e164;
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** "+234 803 ••• 9022" — for screens that show someone else's number. */
export function maskPhone(e164: string): string {
  const local = e164.replace(`+${NG_CODE}`, "");
  if (local.length !== 10) return e164;
  return `+${NG_CODE} ${local.slice(0, 3)} ••• ${local.slice(6)}`;
}
