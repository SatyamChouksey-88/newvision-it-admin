import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SyncOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Select, Tag } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type { MaintenanceStatus } from '../types';

const META: Record<MaintenanceStatus, { label: string; icon: ReactNode; style: CSSProperties }> = {
  reported: {
    label: 'Reported',
    icon: <ClockCircleOutlined />,
    style: { color: '#10239e', background: '#f0f5ff', borderColor: '#adc6ff' },
  },
  under_repair: {
    label: 'Under Repair',
    icon: <ToolOutlined />,
    style: { color: '#873800', background: '#fff7e6', borderColor: '#ffd591' },
  },
  repaired: {
    label: 'Repaired',
    icon: <CheckCircleOutlined />,
    style: { color: '#135200', background: '#f6ffed', borderColor: '#b7eb8f' },
  },
  reassigned: {
    label: 'Reassigned',
    icon: <SyncOutlined />,
    style: { color: '#135200', background: '#f6ffed', borderColor: '#b7eb8f' },
  },
  cancelled: {
    label: 'Cancelled',
    icon: <StopOutlined />,
    style: { color: '#434343', background: '#fafafa', borderColor: '#d9d9d9' },
  },
};

export function MaintenanceStatusTag({ status }: { status: MaintenanceStatus }) {
  const meta = META[status] ?? {
    label: status,
    icon: <ClockCircleOutlined />,
    style: { color: '#434343', background: '#fafafa', borderColor: '#d9d9d9' },
  };
  return (
    <Tag icon={meta.icon} style={{ marginInlineEnd: 0, ...meta.style }}>
      {meta.label}
    </Tag>
  );
}

export const MAINTENANCE_STATUS_OPTIONS: { label: string; value: MaintenanceStatus }[] = (
  Object.keys(META) as MaintenanceStatus[]
).map((s) => ({ label: META[s].label, value: s }));

export const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  reported: ['under_repair', 'cancelled'],
  under_repair: ['repaired', 'cancelled'],
  repaired: ['reassigned'],
  reassigned: [],
  cancelled: [],
};

export function MaintenanceStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: MaintenanceStatus;
  onChange: (next: MaintenanceStatus) => void;
  disabled?: boolean;
}) {
  const allowed = new Set<MaintenanceStatus>([value, ...(MAINTENANCE_TRANSITIONS[value] ?? [])]);
  return (
    <Select<MaintenanceStatus>
      size="small"
      value={value}
      disabled={disabled || allowed.size <= 1}
      aria-label="Change ticket status"
      style={{ minWidth: 150 }}
      onClick={(e) => e.stopPropagation()}
      onChange={(next) => {
        if (next !== value) onChange(next);
      }}
      options={MAINTENANCE_STATUS_OPTIONS.filter((o) => allowed.has(o.value))}
    />
  );
}
