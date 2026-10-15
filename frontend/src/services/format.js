export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const wonFormatter = new Intl.NumberFormat('ko-KR');

export function formatWon(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const rounded = Math.round(Number(value));
  return `${rounded < 0 ? '-' : ''}₩${wonFormatter.format(Math.abs(rounded))}`;
}

export function formatCompactWon(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `₩${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `₩${Math.round(n / 1_000)}k`;
  return `₩${n}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1)}%`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function monthLabel(month, year, short = false) {
  const name = MONTH_NAMES[month - 1];
  return short ? `${name.slice(0, 3)} ${String(year).slice(2)}` : `${name} ${year}`;
}

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

export function monthBounds(month, year) {
  const last = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2, '0')}` };
}

/** Digits only, for currency inputs ("12,000" -> "12000"). */
export function cleanAmountInput(text) {
  return String(text).replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
}

export function groupDigits(text) {
  const digits = cleanAmountInput(text);
  return digits ? wonFormatter.format(Number(digits)) : '';
}
