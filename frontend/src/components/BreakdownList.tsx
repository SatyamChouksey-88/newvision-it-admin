import { Link } from 'react-router';
import { COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '../theme';

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  color: string;
  href?: string;
}

/** Color-coded bullet list used instead of dashboard charts. */
export function BreakdownList({ items, empty }: { items: BreakdownItem[]; empty?: string }) {
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) {
    return (
      <div style={{ padding: '16px 4px', fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
        {empty ?? 'Nothing to show'}
      </div>
    );
  }
  const max = Math.max(...visible.map((i) => i.count), 1);
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0', display: 'grid', gap: 8 }}>
      {visible.map((item) => {
        const row = (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: COLOR_TEXT_PRIMARY,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
          </span>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link to={item.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                {row}
                <span
                  aria-hidden
                  style={{
                    display: 'block',
                    height: 4,
                    marginTop: 4,
                    marginLeft: 20,
                    borderRadius: 4,
                    background: item.color,
                    opacity: 0.25,
                    width: `${Math.max(8, (item.count / max) * 100)}%`,
                  }}
                />
              </Link>
            ) : (
              <>
                {row}
                <span
                  aria-hidden
                  style={{
                    display: 'block',
                    height: 4,
                    marginTop: 4,
                    marginLeft: 20,
                    borderRadius: 4,
                    background: item.color,
                    opacity: 0.25,
                    width: `${Math.max(8, (item.count / max) * 100)}%`,
                  }}
                />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
