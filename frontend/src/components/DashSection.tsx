import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import { type ReactNode, useState } from 'react';

function readCollapsed(key: string, defaultExpanded: boolean): boolean {
  try {
    const raw = localStorage.getItem(`nv.dash.collapse.${key}`);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* private mode */
  }
  return !defaultExpanded;
}

export function DashSection({
  collapseKey,
  title,
  count,
  extra,
  children,
  defaultExpanded = true,
  testId,
  className,
  loading,
}: {
  collapseKey: string;
  title: ReactNode;
  count?: number;
  extra?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  testId?: string;
  className?: string;
  loading?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(collapseKey, defaultExpanded));

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`nv.dash.collapse.${collapseKey}`, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const countLabel =
    typeof count === 'number' ? `${count} item${count === 1 ? '' : 's'}` : null;

  return (
    <Card
      size="small"
      className={className}
      data-testid={testId}
      loading={loading}
      title={
        <span className="nv-dash-title">
          <button
            type="button"
            className="nv-dash-caret"
            aria-expanded={!collapsed}
            aria-controls={`dash-body-${collapseKey}`}
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
            onClick={toggle}
          >
            {collapsed ? <RightOutlined /> : <DownOutlined />}
          </button>
          <span className="nv-dash-title__label">{title}</span>
          {countLabel ? <span className="nv-dash-title__count">{countLabel}</span> : null}
        </span>
      }
      extra={extra}
    >
      <div id={`dash-body-${collapseKey}`} hidden={collapsed}>
        {children}
      </div>
    </Card>
  );
}
