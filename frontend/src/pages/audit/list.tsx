import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Alert, Card, Input, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
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

  const { tableProps, tableQuery, filters, setFilters } = useTable<AuditRow>({
    resource: 'audit-logs',
    pagination: { pageSize: 25 },
    syncWithLocation: true,
    queryOptions: { enabled: allowed },
  });
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];
  const actionFilter = useMemo(() => {
    const f = filters.find((x) => 'field' in x && x.field === 'action');
    if (!f || !('value' in f) || f.value == null || f.value === '') return null;
    return Array.isArray(f.value) ? (f.value as string[]) : [String(f.value)];
  }, [filters]);
  const search = useMemo(() => {
    const f = filters.find((x) => 'field' in x && x.field === 'q');
    return f && 'value' in f ? String(f.value ?? '') : '';
  }, [filters]);
  const isFiltered = !!actionFilter || !!search;

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
      <Input.Search
        allowClear
        placeholder="Search summary, entity id or actor…"
        defaultValue={search}
        onSearch={(v) => setFilters([{ field: 'q', operator: 'contains', value: v || undefined }])}
        style={{ maxWidth: 360, marginBottom: 12 }}
        aria-label="Search audit log"
      />
      {tableQuery.isLoading ? (
        <TableSkeleton columns={5} />
      ) : tableQuery.isError ? (
        <EmptyState
          description="Could not load the audit log."
          actionLabel="Retry"
          onAction={() => void tableQuery.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={isFiltered ? 'No audit entries match these filters' : 'No audit entries yet'}
          actionLabel={isFiltered ? 'Clear filters' : undefined}
          onAction={
            isFiltered
              ? () =>
                  setFilters(
                    [
                      { field: 'q', operator: 'contains', value: undefined },
                      { field: 'action', operator: 'eq', value: undefined },
                    ],
                    'replace',
                  )
              : undefined
          }
        />
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
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(r.oldValue ?? null, null, 1)}
                    </code>
                  </div>
                  <div>
                    <Typography.Text type="secondary">New: </Typography.Text>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(r.newValue ?? null, null, 1)}
                    </code>
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
                // Filtering is server-side (dataProvider forwards `action` to the API), so no client `onFilter`.
                filters: Object.keys(ACTION_COLORS).map((a) => ({ text: a, value: a })),
                filteredValue: actionFilter,
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
                ellipsis: true,
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
