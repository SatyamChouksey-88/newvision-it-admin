import { useTable } from '@refinedev/antd';
import { Card, Input, Select, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PrimaryWithSub } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import { httpClient } from '../../providers/axios';
import type { Department, Employee, Location } from '../../types';

type StatusFilter = 'active' | 'inactive' | 'all';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Active employees', value: 'active' },
  { label: 'Inactive (offboarded)', value: 'inactive' },
  { label: 'All employees', value: 'all' },
];

export function EmployeeList() {
  const navigate = useNavigate();
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const { tableProps, filters, setFilters, tableQuery } = useTable<Employee>({
    resource: 'employees',
    syncWithLocation: true,
    pagination: { pageSize: 25 },
    // Leavers are hidden by default; the status filter reveals them.
    filters: { initial: [{ field: 'isActive', operator: 'eq', value: 'true' }] },
  });
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  useEffect(() => {
    Promise.allSettled([
      httpClient.get('/locations', { params: { _start: 0, _end: 100 } }),
      httpClient.get('/departments', { params: { _start: 0, _end: 100 } }),
    ]).then(([loc, dep]) => {
      if (loc.status === 'fulfilled') setLocations(loc.value.data.data ?? []);
      if (dep.status === 'fulfilled') setDepartments(dep.value.data.data ?? []);
    });
  }, []);

  const active = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of filters ?? []) {
      if ('field' in f && f.value !== undefined && f.value !== null && f.value !== '') {
        out[f.field] = f.value;
      }
    }
    return out;
  }, [filters]);

  const statusValue: StatusFilter =
    active.isActive === 'true' ? 'active' : active.isActive === 'false' ? 'inactive' : 'all';

  const setFilter = (field: string, value: unknown) =>
    setFilters(
      [
        {
          field,
          operator: field === 'q' ? 'contains' : 'eq',
          value: value === undefined || value === null || value === '' ? undefined : value,
        },
      ],
      'merge',
    );

  const hasNarrowing = Boolean(active.q || active.locationId || active.departmentId);

  return (
    <Card
      title={
        <Space size="middle" wrap>
          <Typography.Text strong>Employees</Typography.Text>
          <Select<StatusFilter>
            aria-label="Filter by employment status"
            style={{ width: 200 }}
            value={statusValue}
            options={STATUS_OPTIONS}
            onChange={(v) =>
              setFilter(
                'isActive',
                v === 'active' ? 'true' : v === 'inactive' ? 'false' : undefined,
              )
            }
          />
          <Select
            allowClear
            aria-label="Filter by location"
            placeholder="Location"
            style={{ width: 170 }}
            options={locations.map((l) => ({ label: l.name, value: l.id }))}
            value={active.locationId ? Number(active.locationId) : undefined}
            onChange={(v) => setFilter('locationId', v)}
          />
          <Select
            allowClear
            aria-label="Filter by department"
            placeholder="Department"
            style={{ width: 170 }}
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
            value={active.departmentId ? Number(active.departmentId) : undefined}
            onChange={(v) => setFilter('departmentId', v)}
          />
        </Space>
      }
    >
      {tableQuery.isLoading ? (
        <TableSkeleton columns={5} />
      ) : tableQuery.isError ? (
        <EmptyState
          description="Could not load employees. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void tableQuery.refetch()}
        />
      ) : rows.length === 0 && !tableQuery.isFetching ? (
        <EmptyState
          description={
            hasNarrowing
              ? 'No employees match your search'
              : statusValue === 'inactive'
                ? 'No offboarded employees'
                : 'No employees found'
          }
          actionLabel={hasNarrowing || statusValue !== 'all' ? 'Show all employees' : undefined}
          onAction={
            hasNarrowing || statusValue !== 'all'
              ? () =>
                  setFilters(
                    [
                      { field: 'q', operator: 'contains', value: undefined },
                      { field: 'locationId', operator: 'eq', value: undefined },
                      { field: 'departmentId', operator: 'eq', value: undefined },
                      { field: 'isActive', operator: 'eq', value: undefined },
                    ],
                    'merge',
                  )
              : undefined
          }
        />
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
            rowClassName={(r) => (r.isActive === false ? 'nv-row-inactive' : '')}
            toolbarExtra={
              <Input.Search
                placeholder="Search name, code, email…"
                allowClear
                aria-label="Search employees"
                style={{ width: 260 }}
                key={String(active.q ?? '')}
                defaultValue={(active.q as string | undefined) ?? ''}
                onSearch={(v) => setFilter('q', v.trim())}
              />
            }
            columns={[
              {
                title: 'Employee',
                gridKey: 'employee',
                dataIndex: 'lastName',
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
                defaultWidth: 220,
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
                sorter: true,
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
              {
                title: 'Status',
                dataIndex: 'isActive',
                defaultWidth: 100,
                sorter: true,
                render: (v: boolean | undefined) =>
                  v === false ? <Tag>Inactive</Tag> : <Tag color="success">Active</Tag>,
                getExportValue: (r) => (r.isActive === false ? 'Inactive' : 'Active'),
              },
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
    </Card>
  );
}
