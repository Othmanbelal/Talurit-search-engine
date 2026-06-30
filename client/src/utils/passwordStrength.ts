// Requirement/strength text lives in the profile i18n namespace (password.requirement.*,
// password.strengthLabel.*); this module only returns translation keys, never display strings.
export type PasswordRequirement = { key: string; met: boolean };
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  scoreKey: "veryWeak" | "weak" | "fair" | "good" | "strong";
  requirements: PasswordRequirement[];
};

const STRENGTH_KEYS = ["veryWeak", "weak", "fair", "good", "strong"] as const;

/**
 * Heuristic password strength: scores against length + character-class variety.
 * Intentionally dependency-free; the server still enforces the real minimum.
 */
export function evaluatePassword(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    { key: "length", met: password.length >= 8 },
    { key: "case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { key: "number", met: /\d/.test(password) },
    { key: "symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = requirements.filter((requirement) => requirement.met).length;
  // Long passwords earn an extra point so a strong passphrase isn't penalised.
  const lengthBonus = password.length >= 12 ? 1 : 0;
  const raw = password.length === 0 ? 0 : Math.min(4, metCount + lengthBonus - 1);
  const score = Math.max(0, raw) as PasswordStrength["score"];

  return { score, scoreKey: STRENGTH_KEYS[score], requirements };
}
