import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  FolderOpenOutlined,
  StopOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Select, Tag } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type { TicketPriority, TicketStatus } from '../types';

const STATUS_META: Record<TicketStatus, { label: string; icon: ReactNode; style: CSSProperties }> = {
  open: {
    label: 'Open',
    icon: <FolderOpenOutlined />,
    style: { color: '#10239e', background: '#f0f5ff', borderColor: '#adc6ff' },
  },
  assigned: {
    label: 'Assigned',
    icon: <UserOutlined />,
    style: { color: '#0958d9', background: '#e6f4ff', borderColor: '#91caff' },
  },
  in_progress: {
    label: 'In progress',
    icon: <SyncOutlined />,
    style: { color: '#b45309', background: '#fffbeb', borderColor: '#fde68a' },
  },
  waiting_on_employee: {
    label: 'Waiting on employee',
    icon: <ClockCircleOutlined />,
    style: { color: '#b45309', background: '#fffbeb', borderColor: '#fde68a' },
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircleOutlined />,
    style: { color: '#15803d', background: '#f0fdf4', borderColor: '#bbf7d0' },
  },
  closed: {
    label: 'Closed',
    icon: <StopOutlined />,
    style: { color: '#434343', background: '#fafafa', borderColor: '#d9d9d9' },
  },
  reopened: {
    label: 'Reopened',
    icon: <ExclamationCircleOutlined />,
    style: { color: '#820014', background: '#fff1f0', borderColor: '#ffa39e' },
  },
};

const PRIORITY_META: Record<TicketPriority, { label: string; icon: ReactNode; style: CSSProperties }> = {
  low: {
    label: 'Low',
    icon: <MinusIcon />,
    style: { color: '#475569', background: '#f1f5f9', borderColor: '#cbd5e1' },
  },
  medium: {
    label: 'Medium',
    icon: <ClockCircleOutlined />,
    style: { color: '#10239e', background: '#f0f5ff', borderColor: '#adc6ff' },
  },
  high: {
    label: 'High',
    icon: <ExclamationCircleOutlined />,
    style: { color: '#b45309', background: '#fffbeb', borderColor: '#fde68a' },
  },
  urgent: {
    label: 'Urgent',
    icon: <FireOutlined />,
    style: { color: '#820014', background: '#fff1f0', borderColor: '#ffa39e' },
  },
};

function MinusIcon() {
  return <span aria-hidden>−</span>;
}

export function TicketStatusTag({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  return (
    <Tag icon={meta.icon} style={{ marginInlineEnd: 0, ...meta.style }}>
      {meta.label}
    </Tag>
  );
}

export function TicketPriorityTag({ priority }: { priority: TicketPriority }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <Tag icon={meta.icon} style={{ marginInlineEnd: 0, ...meta.style }}>
      {meta.label}
    </Tag>
  );
}

export const TICKET_STATUS_OPTIONS = (Object.keys(STATUS_META) as TicketStatus[]).map((s) => ({
  label: STATUS_META[s].label,
  value: s,
}));

export const TICKET_PRIORITY_OPTIONS = (Object.keys(PRIORITY_META) as TicketPriority[]).map((s) => ({
  label: PRIORITY_META[s].label,
  value: s,
}));

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['assigned', 'in_progress', 'closed'],
  assigned: ['in_progress', 'open', 'waiting_on_employee', 'resolved'],
  in_progress: ['assigned', 'waiting_on_employee', 'resolved'],
  waiting_on_employee: ['in_progress', 'assigned', 'resolved'],
  resolved: ['closed', 'reopened'],
  reopened: ['assigned', 'in_progress', 'open'],
  closed: ['reopened'],
};

export function TicketStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TicketStatus;
  onChange: (next: TicketStatus) => void;
  disabled?: boolean;
}) {
  const allowed = new Set<TicketStatus>([value, ...(TICKET_TRANSITIONS[value] ?? [])]);
  return (
    <Select<TicketStatus>
      size="small"
      value={value}
      disabled={disabled || allowed.size <= 1}
      aria-label="Change ticket status"
      style={{ minWidth: 150 }}
      onClick={(e) => e.stopPropagation()}
      onChange={(next) => {
        if (next !== value) onChange(next);
      }}
      options={TICKET_STATUS_OPTIONS.filter((o) => allowed.has(o.value))}
    />
  );
}
