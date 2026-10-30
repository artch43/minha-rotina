/** Rules for a new password (sign-up, new password, change password). Signing in doesn't check them,
 * so older accounts with shorter passwords still get in. Supabase checks the same on its side
 * (Authentication → Providers → Email: minimum length 8, letters and digits). */
export const PASSWORD_MIN = 8;

export const passwordRules = (pw: string) => [
  { ok: pw.length >= PASSWORD_MIN, label: `${PASSWORD_MIN} caracteres` },
  { ok: /\d/.test(pw), label: "um número" },
];

/** What's missing, in plain words, or null when the password is good. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (!/\d/.test(pw)) return "A senha precisa ter pelo menos um número.";
  return null;
}
