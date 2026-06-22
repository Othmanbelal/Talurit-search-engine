export type PasswordRequirement = { label: string; met: boolean };
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  requirements: PasswordRequirement[];
};

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;

/**
 * Heuristic password strength: scores against length + character-class variety.
 * Intentionally dependency-free; the server still enforces the real minimum.
 */
export function evaluatePassword(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Upper & lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A number", met: /\d/.test(password) },
    { label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = requirements.filter((requirement) => requirement.met).length;
  // Long passwords earn an extra point so a strong passphrase isn't penalised.
  const lengthBonus = password.length >= 12 ? 1 : 0;
  const raw = password.length === 0 ? 0 : Math.min(4, metCount + lengthBonus - 1);
  const score = Math.max(0, raw) as PasswordStrength["score"];

  return { score, label: STRENGTH_LABELS[score], requirements };
}
