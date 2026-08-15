/**
 * The shape every `useActionState` form in the app shares, so a form component
 * never has to guess how errors come back.
 */
export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  /** Only ever populated by mock providers in development. */
  devHint?: string;
}

export const emptyState: FormState = {};

export function fail(error: string, fieldErrors?: Record<string, string>): FormState {
  return { ok: false, error, fieldErrors };
}

export function succeed(message?: string, devHint?: string): FormState {
  return { ok: true, message, devHint };
}
