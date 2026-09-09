import { CreateButton, DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Space, Table } from 'antd';
import { EmptyState } from '../../components/EmptyState';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import type { Identity } from '../../providers/authProvider';
import type { Location } from '../../types';

export function LocationList() {
  const { tableProps, tableQuery } = useTable<Location>({
    resource: 'locations',
    pagination: { pageSize: 25 },
  });
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  return (
    <List headerButtons={canManage ? <CreateButton /> : null}>
      {tableQuery.isLoading ? (
        <TableSkeleton columns={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No locations defined"
          actionLabel={canManage ? 'Add location' : undefined}
          onAction={canManage ? () => window.location.assign('/locations/create') : undefined}
        />
      ) : (
        <>
          <Table<Location> {...tableProps} rowKey="id" size="small" pagination={false}>
            <Table.Column dataIndex="code" title="Code" />
            <Table.Column dataIndex="name" title="Name" />
            <Table.Column dataIndex="city" title="City" />
            <Table.Column dataIndex="address" title="Address" render={(v) => v ?? '—'} />
            {canManage && (
              <Table.Column<Location>
                title="Actions"
                width={140}
                render={(_, record) => (
                  <Space>
                    <EditButton hideText size="small" recordItemId={record.id} />
                    <DeleteButton hideText size="small" recordItemId={record.id} />
                  </Space>
                )}
              />
            )}
          </Table>
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
    </List>
  );
}
