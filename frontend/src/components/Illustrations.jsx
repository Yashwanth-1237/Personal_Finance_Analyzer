// Simple inline illustrations (no external images) for auth and empty states.

export function WalletIllustration({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#ecfdf5" />
      <rect x="24" y="38" width="72" height="50" rx="10" fill="#0f2747" />
      <rect x="24" y="38" width="72" height="14" rx="7" fill="#1e3a66" />
      <rect x="66" y="56" width="34" height="18" rx="9" fill="#10b981" />
      <circle cx="76" cy="65" r="4" fill="#ecfdf5" />
      <path d="M40 30l26-8 6 16" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChartIllustration({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#eef2f8" />
      <rect x="30" y="66" width="12" height="22" rx="3" fill="#cbd5e1" />
      <rect x="48" y="54" width="12" height="34" rx="3" fill="#94a3b8" />
      <rect x="66" y="42" width="12" height="46" rx="3" fill="#0f2747" />
      <rect x="84" y="58" width="12" height="30" rx="3" fill="#10b981" />
      <path d="M30 52l20-12 18 6 26-16" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReceiptIllustration({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#eef2f8" />
      <path d="M36 24h48v72l-8-6-8 6-8-6-8 6-8-6-8 6z" fill="#fff" stroke="#0f2747" strokeWidth="3" strokeLinejoin="round" />
      <path d="M46 42h28M46 54h28M46 66h16" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="84" cy="80" r="14" fill="#10b981" />
      <path d="M84 73v14M77 80h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#10b981" />
      <path d="M9 21l5-6 4 3 5-7" fill="none" stroke="#0f2747" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
