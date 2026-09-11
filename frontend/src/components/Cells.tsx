import type { ReactNode } from 'react';
import { mutedSubtext, tabularNums } from '../theme';
import { warrantyDaysLabel } from '../utils/format';

/** Primary label with a secondary identifier as muted subtext beneath (no extra column). */
export function PrimaryWithSub({ primary, sub }: { primary: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ lineHeight: 1.25, minWidth: 0, maxWidth: '100%' }}>
      <div className="nv-cell-line" style={{ fontWeight: 500 }}>
        {primary}
      </div>
      {sub ? (
        <div className="nv-cell-line" style={mutedSubtext}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/** Warranty rendered as plain "N days" text, coloured only when urgent (color is not the sole signal). */
export function WarrantyDays({ warrantyEnd }: { warrantyEnd?: string | null }) {
  const { text, days } = warrantyDaysLabel(warrantyEnd);
  let color = '#475569';
  if (days !== null && days < 0) {
    color = '#DC2626';
  } else if (days !== null && days <= 14) {
    color = '#DC2626';
  } else if (days !== null && days <= 45) {
    color = '#B45309';
  }
  return <span style={{ ...tabularNums, color }}>{text}</span>;
}

export function Figure({ children }: { children: ReactNode }) {
  return <span style={tabularNums}>{children}</span>;
}
