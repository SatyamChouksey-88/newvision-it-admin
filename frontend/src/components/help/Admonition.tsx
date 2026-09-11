import { ExclamationCircleFilled, InfoCircleFilled, BulbFilled } from '@ant-design/icons';
import { renderInline } from '../../help/markdown';

const STYLES = {
  note: { border: '#93C5FD', bg: '#EFF6FF', color: '#1D4ED8', icon: InfoCircleFilled, label: 'Note' },
  tip: { border: '#86EFAC', bg: '#F0FDF4', color: '#15803D', icon: BulbFilled, label: 'Tip' },
  warning: { border: '#FDE68A', bg: '#FFFBEB', color: '#B45309', icon: ExclamationCircleFilled, label: 'Warning' },
} as const;

/** A colored, icon-labeled callout — used for anything that's a caveat/tip/warning, not main-line text. */
export function Admonition({ kind, lines }: { kind: 'note' | 'tip' | 'warning'; lines: string[] }) {
  const s = STYLES[kind];
  const Icon = s.icon;
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        margin: '16px 0',
        padding: '12px 14px',
        borderRadius: 8,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      <Icon style={{ color: s.color, fontSize: 15, marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
          {s.label}
        </div>
        {lines.map((line, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: '#1F1F1F' }}>
            {renderInline(line)}
          </div>
        ))}
      </div>
    </div>
  );
}
