"use client";

/**
 * Dependency-free SVG area chart — green gradient fill + glowing line, in the style
 * of the reference dashboard. Feed it a numeric series; it normalizes to the view.
 */
export function AreaChart({
  data,
  height = 120,
  showDot = true,
  strokeWidth = 2,
}: {
  data: number[];
  height?: number;
  showDot?: boolean;
  strokeWidth?: number;
}) {
  const W = 320;
  const H = height;
  const pad = 6;
  const id = Math.random().toString(36).slice(2, 8);

  if (!data || data.length < 2) {
    return <div className="grid h-[120px] place-items-center text-xs text-[var(--muted)]">loading chart…</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);

  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const lastX = x(data.length - 1);
  const lastY = y(data[data.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ee6a0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2ee6a0" stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill={`url(#fill-${id})`} />
      <path d={line} fill="none" stroke="#2ee6a0" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${id})`} />
      {showDot && (
        <>
          <circle cx={lastX} cy={lastY} r="3.4" fill="#2ee6a0" filter={`url(#glow-${id})`} />
          <circle cx={lastX} cy={lastY} r="6.5" fill="none" stroke="#2ee6a0" strokeOpacity="0.35" />
        </>
      )}
    </svg>
  );
}
