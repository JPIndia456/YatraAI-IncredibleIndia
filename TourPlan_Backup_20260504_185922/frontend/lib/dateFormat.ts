/** Calendar ISO `YYYY-MM-DD` → display `DD/MM/YYYY` (no timezone shift). */
export function isoDateToDdMmYyyy(iso: string): string {
  const m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso).trim();
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Strict `DD/MM/YYYY` or `DD-MM-YYYY` → ISO calendar date, or null if invalid. */
export function ddMmYyyyToIso(text: string): string | null {
  const m = String(text).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const cal = new Date(yyyy, mm - 1, dd);
  if (cal.getFullYear() !== yyyy || cal.getMonth() !== mm - 1 || cal.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
