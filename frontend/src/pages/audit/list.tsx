import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Alert, Card, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import type { Identity } from '../../providers/authProvider';
import { formatDate } from '../../utils/format';

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  assign: 'geekblue',
  transfer: 'purple',
  status_change: 'gold',
  retire: 'orange',
  dispose: 'volcano',
  delete: 'red',
  import: 'cyan',
  checkout: 'geekblue',
  checkin: 'blue',
  stock_adjust: 'gold',
  issue: 'purple',
  approve: 'green',
  reject: 'red',
  fulfill: 'cyan',
};

interface AuditRow {
  id: number;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changedBy?: { fullName: string };
  oldValue?: unknown;
  newValue?: unknown;
}

export function AuditList() {
  const { data: identity } = useGetIdentity<Identity>();
  const allowed = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [expanded, setExpanded] = useState<number[]>([]);

  const { tableProps, tableQuery } = useTable<AuditRow>({
    resource: 'audit-logs',
    pagination: { pageSize: 25 },
    queryOptions: { enabled: allowed },
  });
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  if (!allowed) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Restricted"
        description="The audit log is only available to Super Admin and IT Admin."
      />
    );
  }

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Typography.Text strong>Audit Log</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Append-only record of every change (who, what, old → new, when).
          </Typography.Text>
        </Space>
      }
    >
      {tableQuery.isLoading ? (
        <TableSkeleton columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState description="No audit entries yet" />
      ) : (
        <>
          <DataGrid<AuditRow>
            tableKey="audit-logs"
            searchInputId="audit-grid-search"
            dataSource={rows}
            loading={tableQuery.isFetching}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            fixFirstColumn
            serverSide
            onChange={tableProps.onChange}
            expandable={{
              expandedRowKeys: expanded,
              onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
              expandedRowRender: (r) => (
                <Space direction="vertical" size={4} style={{ fontSize: 12 }}>
                  <div>
                    <Typography.Text type="secondary">Old: </Typography.Text>
                    <code>{JSON.stringify(r.oldValue ?? null)}</code>
                  </div>
                  <div>
                    <Typography.Text type="secondary">New: </Typography.Text>
                    <code>{JSON.stringify(r.newValue ?? null)}</code>
                  </div>
                </Space>
              ),
            }}
            columns={[
              {
                title: 'When',
                dataIndex: 'createdAt',
                defaultWidth: 160,
                sorter: true,
                render: (v) => formatDate(v as string),
              },
              {
                title: 'Action',
                dataIndex: 'action',
                defaultWidth: 130,
                filters: Object.keys(ACTION_COLORS).map((a) => ({ text: a, value: a })),
                onFilter: (value, r) => r.action === value,
                render: (v: string) => <Tag color={ACTION_COLORS[v] ?? 'default'}>{v}</Tag>,
              },
              {
                title: 'Entity',
                dataIndex: 'entityType',
                defaultWidth: 120,
              },
              {
                title: 'ID',
                gridKey: 'entityId',
                dataIndex: 'entityId',
                defaultWidth: 100,
                render: (v: string) => (
                  <Space size={4}>
                    {v}
                    <CopyButton value={v} label="entity id" />
                  </Space>
                ),
              },
              {
                title: 'Summary',
                dataIndex: 'summary',
                defaultWidth: 280,
              },
              {
                title: 'By',
                gridKey: 'changedBy',
                defaultWidth: 160,
                render: (_, r) => r.changedBy?.fullName ?? '—',
                getExportValue: (r) => r.changedBy?.fullName ?? '',
              },
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
    </Card>
  );
}
