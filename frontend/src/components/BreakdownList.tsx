import { Link } from 'react-router';
import { COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '../theme';

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  color: string;
  href?: string;
  /** e.g. "20%" — shown as its own column, never glued to the name. */
  percent?: string;
  /** e.g. "Assigned 412 · Available 80" — second line under the name. */
  detail?: string;
}

/** Color-coded list used instead of dashboard charts. Each field is its own cell. */
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
    <ul className="nv-breakdown" style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
      {visible.map((item) => {
        const inner = (
          <>
            <span className="nv-breakdown-row">
              <span
                aria-hidden
                className="nv-breakdown-dot"
                style={{ background: item.color }}
              />
              <span className="nv-breakdown-copy">
                <span className="nv-breakdown-label">{item.label}</span>
                {item.detail ? <span className="nv-breakdown-detail">{item.detail}</span> : null}
              </span>
              {item.percent ? <span className="nv-breakdown-pct">{item.percent}</span> : null}
              <span className="nv-breakdown-count">{item.count.toLocaleString()}</span>
            </span>
            <span
              aria-hidden
              className="nv-breakdown-bar"
              style={{
                background: item.color,
                width: `${Math.max(8, (item.count / max) * 100)}%`,
              }}
            />
          </>
        );
        return (
          <li key={item.key} className="nv-breakdown-item">
            {item.href ? (
              <Link to={item.href} className="nv-breakdown-link">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
