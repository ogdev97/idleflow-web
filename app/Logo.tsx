export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="idlf-leaf" x1="20" y1="8" x2="46" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5ee08a" />
          <stop offset="1" stopColor="#22c98b" />
        </linearGradient>
        <linearGradient id="idlf-hand" x1="12" y1="40" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2bd4c4" />
          <stop offset="1" stopColor="#22c98b" />
        </linearGradient>
      </defs>

      {/* dotted orbit ring */}
      <circle cx="32" cy="32" r="27" stroke="#2bd4c4" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="1.5 4" strokeLinecap="round" />

      {/* sprout — centre leaf + two side leaves + stem */}
      <path d="M32 15c5 3 6.5 9 0 15-6.5-6-5-12 0-15Z" fill="url(#idlf-leaf)" />
      <path d="M31 30c-3.5-1-8-.5-11 3 4 2.4 8.3 1.6 11-1Z" fill="url(#idlf-leaf)" opacity="0.92" />
      <path d="M33 30c3.5-1 8-.5 11 3-4 2.4-8.3 1.6-11-1Z" fill="url(#idlf-leaf)" opacity="0.92" />
      <path d="M32 26v14" stroke="#22c98b" strokeWidth="2.2" strokeLinecap="round" />

      {/* cupped hand */}
      <path
        d="M15 40c2 6 9 10 17 10s15-4 17-10"
        stroke="url(#idlf-hand)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M46 40c1.5-1 3.5-1 5 .3" stroke="url(#idlf-hand)" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* sparkles */}
      <path d="M18 20l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" fill="#5ee08a" />
      <circle cx="47" cy="19" r="1.1" fill="#2bd4c4" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-semibold tracking-tight">IdleFlow</span>
    </span>
  );
}
