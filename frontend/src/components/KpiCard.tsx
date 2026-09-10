import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { Link } from 'react-router';
import {
  COLOR_BORDER,
  COLOR_SURFACE,
  COLOR_TEXT_MUTED,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
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
  subtitle?: string;
}

/**
 * Signature KPI tile from the approved Claude Design mockup:
 * white surface, 3px top accent bar, glyph + label, mono value, muted sub-line.
 */
export function KpiCard({
  title,
  value,
  icon,
  accentColor = KPI_TOTAL,
  valueColor = COLOR_TEXT_PRIMARY,
  href,
  sparkline,
  subtitle,
}: KpiCardProps) {
  const inner = (
    <div
      style={{
        background: COLOR_SURFACE,
        borderRadius: 8,
        border: `1px solid ${COLOR_BORDER}`,
        overflow: 'hidden',
        boxShadow: '0 1px 1px rgba(16,24,40,0.03)',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      className={href ? 'nv-kpi-card nv-kpi-card--clickable' : 'nv-kpi-card'}
    >
      <div style={{ height: 3, background: accentColor }} aria-hidden />
      <div style={{ padding: '12px 14px 13px' }}>
        <div
          className="nv-kpi-label"
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: COLOR_TEXT_SECONDARY,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: accentColor, fontSize: 12, lineHeight: 1 }}>{icon}</span>
          <Tooltip title={subtitle ? `${title}: ${subtitle}` : title}>
            <span>{title}</span>
          </Tooltip>
        </div>
        <div
          style={{
            fontSize: 23,
            fontWeight: 600,
            lineHeight: 1.1,
            color: valueColor,
            marginTop: 6,
            letterSpacing: '-0.02em',
            ...tabularNums,
          }}
        >
          {value.toLocaleString()}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 11, color: COLOR_TEXT_MUTED, marginTop: 3 }}>{subtitle}</div>
        ) : null}
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
