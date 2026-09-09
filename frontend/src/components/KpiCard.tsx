import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  COLOR_BORDER,
  COLOR_SURFACE_MUTED,
  COLOR_TEXT_PRIMARY,
  KPI_TOTAL,
  tabularNums,
} from '../theme';

export interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  accentColor?: string;
  valueColor?: string;
  href?: string;
  sparkline?: ReactNode;
}

/**
 * Signature KPI tile from the approved Claude Design mockup:
 * muted surface, 4px top accent bar, label + value + icon.
 */
export function KpiCard({
  title,
  value,
  icon,
  accentColor = KPI_TOTAL,
  valueColor = COLOR_TEXT_PRIMARY,
  href,
  sparkline,
}: KpiCardProps) {
  const inner = (
    <div
      style={{
        background: COLOR_SURFACE_MUTED,
        borderRadius: 10,
        border: `1px solid ${COLOR_BORDER}`,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      className={href ? 'nv-kpi-card nv-kpi-card--clickable' : 'nv-kpi-card'}
    >
      <div style={{ height: 4, background: accentColor }} aria-hidden />
      <div style={{ padding: '14px 16px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="nv-kpi-label"
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 4,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1.1,
                color: valueColor,
                ...tabularNums,
              }}
            >
              {value.toLocaleString()}
            </div>
          </div>
          <span style={{ color: accentColor, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        </div>
        {sparkline ? <div style={{ marginTop: 10 }}>{sparkline}</div> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        aria-label={`${title}: ${value}. View filtered list`}
        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        className="nv-kpi-link"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
