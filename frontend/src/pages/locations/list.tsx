import { CreateButton, DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Space } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { FirstRunWelcome } from '../../components/FirstRunWelcome';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import { useSetupStatus } from '../../hooks/useSetupStatus';
import type { Identity } from '../../providers/authProvider';
import type { Location } from '../../types';

export function LocationList() {
  const [density, setDensity] = useState<TableDensity>('Compact');
  const { freshInstall } = useSetupStatus();
  const navigate = useNavigate();
  const { tableProps, tableQuery } = useTable<Location>({
    resource: 'locations',
    pagination: { pageSize: 25 },
    syncWithLocation: true,
  });
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  return (
    <List headerButtons={canManage ? <CreateButton /> : null}>
      {tableQuery.isLoading ? (
        <TableSkeleton columns={4} />
      ) : tableQuery.isError ? (
        <EmptyState
          description="Could not load locations."
          actionLabel="Retry"
          onAction={() => void tableQuery.refetch()}
        />
      ) : rows.length === 0 && freshInstall ? (
        <FirstRunWelcome />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No locations defined"
          actionLabel={canManage ? 'Add location' : undefined}
          onAction={canManage ? () => navigate('/locations/create') : undefined}
        />
      ) : (
        <>
          <DataGrid<Location>
            tableKey="locations"
            rowKey="id"
            dataSource={rows}
            loading={tableQuery.isFetching}
            density={density}
            onDensityChange={setDensity}
            quickFilter
            quickFilterPlaceholder="Search locations"
            fixFirstColumn
            serverSide
            onChange={tableProps.onChange}
            columns={[
              {
                title: 'Code',
                dataIndex: 'code',
                sorter: true,
                render: (v: string) => (
                  <Space size={4}>
                    {v}
                    <CopyButton value={v} label="location code" />
                  </Space>
                ),
              },
              { title: 'Name', dataIndex: 'name', sorter: true },
              { title: 'City', dataIndex: 'city', sorter: true },
              {
                title: 'Address',
                dataIndex: 'address',
                render: (v) => v ?? '—',
              },
              ...(canManage
                ? [
                    {
                      title: 'Actions',
                      gridKey: 'actions',
                      exportable: false,
                      render: (_: unknown, record: Location) => (
                        <Space>
                          <EditButton hideText size="small" recordItemId={record.id} />
                          <DeleteButton hideText size="small" recordItemId={record.id} />
                        </Space>
                      ),
                    },
                  ]
                : []),
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
    </List>
  );
}
