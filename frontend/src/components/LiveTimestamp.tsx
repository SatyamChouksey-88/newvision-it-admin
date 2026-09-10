import { useEffect, useState } from 'react';

function relative(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  return `${h} hour${h === 1 ? '' : 's'} ago`;
}

/** Plain "Updated Ns ago" text, matching the approved mockup's dashboard subtitle. */
export function LiveTimestamp({ at, refreshing }: { at: number; refreshing?: boolean }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return <>{refreshing ? 'Refreshing…' : `Updated ${relative(Date.now() - at)}`}</>;
}
