/** Calendar ISO `YYYY-MM-DD` → display `DD/MM/YYYY` (no timezone shift). */
export function isoDateToDdMmYyyy(iso: string | undefined | null): string {
  if (!iso) return '—';
  const m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso).trim();
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Parses `DD/MM/YYYY`, `DD-MM-YYYY`, or `YYYY-MM-DD` → ISO `YYYY-MM-DD`. */
export function ddMmYyyyToIso(text: string): string | null {
  const t = String(text).trim();
  if (!t) return null;

  let dd: number, mm: number, yyyy: number;

  // Try DD/MM/YYYY or DD-MM-YYYY
  const m1 = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m1) {
    dd = parseInt(m1[1], 10);
    mm = parseInt(m1[2], 10);
    yyyy = parseInt(m1[3], 10);
  } else {
    // Try YYYY-MM-DD or YYYY/MM/DD
    const m2 = t.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (m2) {
      yyyy = parseInt(m2[1], 10);
      mm = parseInt(m2[2], 10);
      dd = parseInt(m2[3], 10);
    } else {
      return null;
    }
  }

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const cal = new Date(yyyy, mm - 1, dd);
  if (cal.getFullYear() !== yyyy || cal.getMonth() !== mm - 1 || cal.getDate() !== dd) return null;
  
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** ISO `YYYY-MM-DD` → display `DD-Month-YY` (e.g. 10-May-26). */
export function isoToDdMonthYy(iso: string | undefined | null): string {
  if (!iso) return '—';
  const m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso).trim();
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[parseInt(m[2], 10) - 1] || '???';
  const yearShort = m[1].slice(-2);
  
  return `${m[3]}-${month}-${yearShort}`;
}
