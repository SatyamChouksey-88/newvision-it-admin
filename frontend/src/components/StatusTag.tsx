import {
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type { AssetStatus } from '../types';

interface StatusMeta {
  label: string;
  icon: ReactNode;
  style: CSSProperties;
}

/** WCAG AA–safe tag colours: colour + icon + text (never colour alone). */
const STATUS_META: Record<AssetStatus, StatusMeta> = {
  assigned: {
    label: 'Assigned',
    icon: <CheckCircleOutlined />,
    style: { color: '#135200', background: '#f6ffed', borderColor: '#b7eb8f' },
  },
  available: {
    label: 'Available',
    icon: <MinusCircleOutlined />,
    style: { color: '#434343', background: '#fafafa', borderColor: '#d9d9d9' },
  },
  under_repair: {
    label: 'Under Repair',
    icon: <ToolOutlined />,
    style: { color: '#873800', background: '#fff7e6', borderColor: '#ffd591' },
  },
  retired: {
    label: 'Retired',
    icon: <InboxOutlined />,
    style: { color: '#434343', background: '#fafafa', borderColor: '#d9d9d9' },
  },
  disposed: {
    label: 'Disposed',
    icon: <DeleteOutlined />,
    style: { color: '#434343', background: '#f5f5f5', borderColor: '#d9d9d9' },
  },
  lost: {
    label: 'Lost',
    icon: <ExclamationCircleOutlined />,
    style: { color: '#820014', background: '#fff1f0', borderColor: '#ffa39e' },
  },
  damaged: {
    label: 'Damaged',
    icon: <ExclamationCircleOutlined />,
    style: { color: '#820014', background: '#fff1f0', borderColor: '#ffa39e' },
  },
  pending_assignment: {
    label: 'Pending Assignment',
    icon: <StopOutlined />,
    style: { color: '#10239e', background: '#f0f5ff', borderColor: '#adc6ff' },
  },
};

export function StatusTag({ status }: { status: AssetStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    icon: <MinusCircleOutlined />,
    style: { color: '#434343', background: '#fafafa', borderColor: '#d9d9d9' },
  };
  return (
    <Tag icon={meta.icon} style={{ marginInlineEnd: 0, ...meta.style }}>
      {meta.label}
    </Tag>
  );
}

export const ASSET_STATUS_OPTIONS: { label: string; value: AssetStatus }[] = (
  Object.keys(STATUS_META) as AssetStatus[]
).map((s) => ({ label: STATUS_META[s].label, value: s }));
