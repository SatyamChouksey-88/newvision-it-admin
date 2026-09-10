import { useEffect, useState } from 'react';

function relative(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

/** A small pulsing "updated Ns ago" indicator — ticks every 5s, respects prefers-reduced-motion via CSS. */
export function LiveTimestamp({ at, refreshing }: { at: number; refreshing?: boolean }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748b' }}>
      <span className="nv-live-dot" aria-hidden />
      {refreshing ? 'Refreshing…' : `Updated ${relative(Date.now() - at)}`}
    </span>
  );
}
