"use client";

/**
 * Dependency-free SVG area chart — smooth (Catmull-Rom) green line + gradient fill,
 * in the style of the reference dashboard. Near-flat series are given vertical
 * headroom so day-to-day noise reads as a gentle trend, not violent spikes.
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
  const pad = 8;
  const id = Math.random().toString(36).slice(2, 8);

  if (!data || data.length < 2) {
    return <div style={{ height }} className="grid place-items-center text-xs text-[var(--muted)]">loading chart…</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  // Headroom so a ~1% wiggle doesn't fill the whole panel.
  const lo = min - span * 0.6;
  const hi = max + span * 0.6;
  const range = hi - lo;
  const x = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / range) * (H - pad * 2);

  const pts: [number, number][] = data.map((v, i) => [x(i), y(v)]);
  // Catmull-Rom → cubic bezier for a smooth line.
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ee6a0" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#2ee6a0" stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill={`url(#fill-${id})`} />
      <path d={line} fill="none" stroke="#2ee6a0" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${id})`} vectorEffect="non-scaling-stroke" />
      {showDot && (
        <>
          <circle cx={lastX} cy={lastY} r="3.2" fill="#2ee6a0" filter={`url(#glow-${id})`} />
          <circle cx={lastX} cy={lastY} r="6" fill="none" stroke="#2ee6a0" strokeOpacity="0.35" />
        </>
      )}
    </svg>
  );
}
