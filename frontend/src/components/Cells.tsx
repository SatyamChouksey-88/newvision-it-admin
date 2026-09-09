import type { ReactNode } from 'react';
import { mutedSubtext, tabularNums } from '../theme';
import { warrantyDaysLabel } from '../utils/format';

/** Primary label with a secondary identifier as muted subtext beneath (no extra column). */
export function PrimaryWithSub({ primary, sub }: { primary: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ lineHeight: 1.25 }}>
      <div style={{ fontWeight: 500 }}>{primary}</div>
      {sub ? <div style={mutedSubtext}>{sub}</div> : null}
    </div>
  );
}

/** Warranty rendered as plain "N days" text, coloured only when urgent (color is not the sole signal). */
export function WarrantyDays({ warrantyEnd }: { warrantyEnd?: string | null }) {
  const { text, days } = warrantyDaysLabel(warrantyEnd);
  let color = '#595959';
  if (days !== null && days < 0) {
    color = '#cf1322';
  } else if (days !== null && days <= 30) {
    color = '#d46b08';
  }
  return <span style={{ ...tabularNums, color }}>{text}</span>;
}

export function Figure({ children }: { children: ReactNode }) {
  return <span style={tabularNums}>{children}</span>;
}
