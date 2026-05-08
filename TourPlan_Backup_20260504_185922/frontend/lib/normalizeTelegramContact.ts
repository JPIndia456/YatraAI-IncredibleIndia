/** Normalize Telegram @username or phone-style input for storage and outbound sends. */
export function normalizeTelegramContact(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('@')) s = s.slice(1).trim();
  const compact = s.replace(/\s+/g, '');
  const digitsOnly = compact.replace(/\D/g, '');
  const looksLikePhone = /^\+?[\d\s\-]+$/.test(raw.trim()) && digitsOnly.length >= 10;
  if (looksLikePhone) return digitsOnly;
  return compact;
}
