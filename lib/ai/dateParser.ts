export function parseTargetDateFromText(inputRaw: string): Date | null {
  const input = (inputRaw || '').toLowerCase().trim();
  if (!input) return null;

  const today = new Date();
  const currentYear = today.getFullYear();

  // Relative weeks, e.g., "in 8 weeks"
  if (/\b\d+\s*weeks?\b/.test(input)) {
    const weeks = parseInt(input.replace(/[^0-9]/g, '')) || 8;
    const d = new Date(today);
    d.setDate(today.getDate() + weeks * 7);
    return d;
  }

  // Relative months, e.g., "in 2 months"
  if (/\b\d+\s*months?\b/.test(input)) {
    const months = parseInt(input.replace(/[^0-9]/g, '')) || 2;
    const d = new Date(today);
    d.setMonth(today.getMonth() + months);
    return d;
  }

  const monthNames = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const monthAbbrevs = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  // Month name + day e.g., "January 30th"
  for (let i = 0; i < monthNames.length; i++) {
    if (input.includes(monthNames[i]) || input.includes(monthAbbrevs[i])) {
      const dayMatch = input.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        const d = new Date(currentYear, i, day);
        if (isNaN(d.getTime())) return null;
        if (d < today) d.setFullYear(currentYear + 1);
        return d;
      }
    }
  }

  // Numeric month/day e.g., 1/30 or 01-30
  const md = input.match(/(\d{1,2})[\/-](\d{1,2})/);
  if (md) {
    const month = parseInt(md[1]) - 1;
    const day = parseInt(md[2]);
    const d = new Date(currentYear, month, day);
    if (isNaN(d.getTime())) return null;
    if (d < today) d.setFullYear(currentYear + 1);
    return d;
  }

  return null;
}

export function toISODateString(d: Date): string {
  // Normalize to noon UTC to minimize timezone date shifts when stored/displayed
  const copy = new Date(d);
  copy.setUTCHours(12, 0, 0, 0);
  return copy.toISOString().split('T')[0];
}


