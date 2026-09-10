import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router';
import { STATUS_CHART_COLORS, STATUS_LABELS } from '../chartColors';
import { COLOR_TEXT_SECONDARY } from '../theme';
import type { AssetStatus } from '../types';
import { StatusTag } from './StatusTag';

const STATUS_ORDER: AssetStatus[] = [
  'assigned',
  'available',
  'under_repair',
  'pending_assignment',
  'lost',
  'damaged',
  'retired',
  'disposed',
];

const SHORT_STATUS: Record<AssetStatus, string> = {
  assigned: 'Assigned',
  available: 'Available',
  under_repair: 'Repair',
  pending_assignment: 'Pending',
  lost: 'Lost',
  damaged: 'Damaged',
  retired: 'Retired',
  disposed: 'Disposed',
};

function tint(hex: string, alpha: number) {
  const n = hex.replace('#', '');
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface StatusBreakdownRow {
  key: string;
  status: AssetStatus;
  label: string;
  count: number;
  percent?: string;
  color: string;
  href?: string;
}

export interface LocationBreakdownRow {
  key: string;
  name: string;
  total: number;
  href?: string;
  byStatus: Partial<Record<AssetStatus, number>>;
  statusHref?: (status: AssetStatus) => string;
}

function EmptyCell({ text }: { text: string }) {
  return (
    <div style={{ padding: '16px 4px', fontSize: 13, color: COLOR_TEXT_SECONDARY }}>{text}</div>
  );
}

/** Status distribution as a colored table: Status · Count · Share. */
export function StatusBreakdownTable({
  items,
  empty,
}: {
  items: StatusBreakdownRow[];
  empty?: string;
}) {
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) {
    return <EmptyCell text={empty ?? 'Nothing to show'} />;
  }
  const max = Math.max(...visible.map((i) => i.count), 1);

  const columns: ColumnsType<StatusBreakdownRow> = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_: AssetStatus, row) =>
        row.href ? (
          <Link to={row.href} className="nv-breakdown-link">
            <StatusTag status={row.status} />
          </Link>
        ) : (
          <StatusTag status={row.status} />
        ),
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
      width: 88,
      render: (count: number, row) => {
        const value = <span className="nv-breakdown-num">{count.toLocaleString()}</span>;
        return row.href ? (
          <Link to={row.href} className="nv-breakdown-link">
            {value}
          </Link>
        ) : (
          value
        );
      },
    },
    {
      title: 'Share',
      key: 'share',
      width: 160,
      render: (_: unknown, row) => {
        const pct = row.percent ?? `${Math.round((row.count / max) * 100)}%`;
        const bar = (
          <span className="nv-status-share">
            <span className="nv-status-share-track">
              <span
                className="nv-status-share-fill"
                style={{
                  width: `${Math.max(6, (row.count / max) * 100)}%`,
                  background: row.color,
                }}
              />
            </span>
            <span className="nv-breakdown-pct">{pct}</span>
          </span>
        );
        return row.href ? (
          <Link to={row.href} className="nv-breakdown-link">
            {bar}
          </Link>
        ) : (
          bar
        );
      },
    },
  ];

  return (
    <Table<StatusBreakdownRow>
      className="nv-breakdown-table"
      size="small"
      pagination={false}
      rowKey="key"
      columns={columns}
      dataSource={visible}
      onRow={(row) => ({
        style: { background: tint(row.color, 0.07) },
      })}
    />
  );
}

/** One office per row; each status is its own colored column. */
export function LocationBreakdownTable({
  rows,
  empty,
}: {
  rows: LocationBreakdownRow[];
  empty?: string;
}) {
  if (rows.length === 0) {
    return <EmptyCell text={empty ?? 'Nothing to show'} />;
  }

  const activeStatuses = STATUS_ORDER.filter((status) =>
    rows.some((row) => (row.byStatus[status] ?? 0) > 0),
  );

  const columns: ColumnsType<LocationBreakdownRow> = [
    {
      title: 'Location',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      render: (name: string, row) =>
        row.href ? (
          <Link to={row.href} className="nv-breakdown-link nv-breakdown-loc">
            {name}
          </Link>
        ) : (
          <span className="nv-breakdown-loc">{name}</span>
        ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      width: 72,
      render: (total: number, row) => {
        const value = <span className="nv-breakdown-num">{total.toLocaleString()}</span>;
        return row.href ? (
          <Link to={row.href} className="nv-breakdown-link">
            {value}
          </Link>
        ) : (
          value
        );
      },
    },
    ...activeStatuses.map((status) => {
      const color = STATUS_CHART_COLORS[status];
      return {
        title: SHORT_STATUS[status] ?? STATUS_LABELS[status],
        key: status,
        align: 'right' as const,
        width: 78,
        onHeaderCell: () => ({
          style: {
            color,
            background: tint(color, 0.12),
            fontWeight: 600,
          },
        }),
        render: (_: unknown, row: LocationBreakdownRow) => {
          const count = row.byStatus[status] ?? 0;
          if (count <= 0) {
            return <span className="nv-breakdown-zero">—</span>;
          }
          const href = row.statusHref?.(status);
          const value = (
            <span className="nv-breakdown-num" style={{ color }}>
              {count.toLocaleString()}
            </span>
          );
          return href ? (
            <Link to={href} className="nv-breakdown-link">
              {value}
            </Link>
          ) : (
            value
          );
        },
      };
    }),
  ];

  return (
    <Table<LocationBreakdownRow>
      className="nv-breakdown-table nv-location-table"
      size="small"
      pagination={false}
      rowKey="key"
      columns={columns}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
    />
  );
}
