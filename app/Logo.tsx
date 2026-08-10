export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="9" fill="#0c1016" stroke="rgba(46,230,160,0.5)" />
        {/* stylised upward flow */}
        <path d="M8 20.5c3-0 4.5-9 8-9s5 6 8 6" stroke="#2ee6a0" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <circle cx="24" cy="17.5" r="2.1" fill="#2ee6a0" />
      </svg>
      <span className="font-semibold tracking-tight">IdleFlow</span>
    </span>
  );
}
