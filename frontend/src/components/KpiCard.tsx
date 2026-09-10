import type { ReactNode } from 'react';
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
  /** Bento "hero" tile — larger type, glow accent bar, room for a footer slot. */
  hero?: boolean;
  footer?: ReactNode;
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
  hero = false,
  footer,
}: KpiCardProps) {
  const inner = (
    <div
      style={{
        background: COLOR_SURFACE,
        borderRadius: hero ? 14 : 8,
        border: `1px solid ${COLOR_BORDER}`,
        overflow: 'hidden',
        boxShadow: hero
          ? `0 1px 1px rgba(16,24,40,0.03), inset 0 0 0 1px rgba(9,88,217,0.04)`
          : '0 1px 1px rgba(16,24,40,0.03)',
        height: '100%',
      }}
      className={href ? 'nv-kpi-card nv-kpi-card--clickable' : 'nv-kpi-card'}
    >
      <div style={{ height: hero ? 4 : 3, background: accentColor }} aria-hidden />
      <div style={{ padding: hero ? '20px 22px 20px' : '12px 14px 13px' }}>
        <div
          className="nv-kpi-label"
          style={{
            fontSize: hero ? 13 : 11.5,
            fontWeight: 500,
            color: COLOR_TEXT_SECONDARY,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: accentColor, fontSize: hero ? 15 : 12, lineHeight: 1 }}>{icon}</span>
          {title}
        </div>
        <div
          style={{
            fontSize: hero ? 40 : 23,
            fontWeight: 600,
            lineHeight: 1.1,
            color: valueColor,
            marginTop: hero ? 10 : 6,
            letterSpacing: '-0.02em',
            ...tabularNums,
          }}
        >
          {value.toLocaleString()}
        </div>
        {subtitle ? (
          <div style={{ fontSize: hero ? 12.5 : 11, color: COLOR_TEXT_MUTED, marginTop: hero ? 5 : 3 }}>
            {subtitle}
          </div>
        ) : null}
        {sparkline ? <div style={{ marginTop: hero ? 16 : 10 }}>{sparkline}</div> : null}
        {footer ? (
          <div style={{ marginTop: hero ? 16 : 10, paddingTop: hero ? 14 : 0, borderTop: hero ? '1px solid #F1F4F8' : 'none' }}>
            {footer}
          </div>
        ) : null}
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
