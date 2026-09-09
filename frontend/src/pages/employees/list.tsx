import { useTable } from '@refinedev/antd';
import { Card, Input, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CopyButton } from '../../components/CopyButton';
import { PrimaryWithSub } from '../../components/Cells';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import type { Employee } from '../../types';

export function EmployeeList() {
  const navigate = useNavigate();
  const [density, setDensity] = useState<TableDensity>('Compact');
  const { tableProps, setFilters, tableQuery } = useTable<Employee>({
    resource: 'employees',
    syncWithLocation: true,
    pagination: { pageSize: 25 },
  });
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  return (
    <Card title={<Typography.Text strong>Employees</Typography.Text>}>
      {tableQuery.isLoading ? (
        <TableSkeleton columns={5} />
      ) : rows.length === 0 && !tableQuery.isFetching ? (
        <EmptyState description="No employees match your search" />
      ) : (
        <>
          <DataGrid<Employee>
            tableKey="employees"
            searchInputId="employees-grid-search"
            dataSource={rows}
            loading={tableQuery.isFetching}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            fixFirstColumn
            serverSide
            onChange={tableProps.onChange}
            quickFilterPlaceholder="Filter rows…"
            onRow={(record) => ({
              onClick: () => navigate(`/employees/show/${record.id}`),
            })}
            toolbarExtra={
              <Input.Search
                placeholder="Search name, code, email…"
                allowClear
                aria-label="Search employees"
                style={{ width: 260 }}
                onSearch={(v) =>
                  setFilters([{ field: 'q', operator: 'contains', value: v }], 'merge')
                }
              />
            }
            columns={[
              {
                title: 'Employee',
                gridKey: 'employee',
                defaultWidth: 220,
                sorter: true,
                render: (_, r) => (
                  <Space size={4}>
                    <PrimaryWithSub
                      primary={
                        <Space size={4}>
                          {`${r.firstName} ${r.lastName}`}
                          {r.isActive === false ? <Tag>Inactive</Tag> : null}
                        </Space>
                      }
                      sub={r.employeeCode}
                    />
                    <CopyButton value={r.employeeCode} label="employee code" />
                  </Space>
                ),
                getExportValue: (r) => `${r.firstName} ${r.lastName} (${r.employeeCode})`,
              },
              {
                title: 'Email',
                dataIndex: 'email',
                defaultWidth: 200,
                sorter: true,
                render: (v: string) => (
                  <Space size={4}>
                    {v}
                    <CopyButton value={v} label="email" />
                  </Space>
                ),
              },
              {
                title: 'Designation',
                dataIndex: 'designation',
                render: (v) => v ?? '—',
              },
              {
                title: 'Location',
                gridKey: 'location',
                render: (_, r) => r.location?.code ?? '—',
                getExportValue: (r) => r.location?.code ?? '',
              },
              {
                title: 'Department',
                gridKey: 'department',
                render: (_, r) => r.department?.name ?? '—',
                getExportValue: (r) => r.department?.name ?? '',
              },
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
    </Card>
  );
}
