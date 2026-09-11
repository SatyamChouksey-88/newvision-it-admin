import { PlusOutlined } from '@ant-design/icons';
import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Alert, Button, Card, Input, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PrimaryWithSub } from '../../components/Cells';
import { ChipSelect } from '../../components/ChipSelect';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { FirstRunWelcome } from '../../components/FirstRunWelcome';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import { useSetupStatus } from '../../hooks/useSetupStatus';
import type { Identity } from '../../providers/authProvider';
import { httpClient } from '../../providers/axios';
import type { Department, Employee, Location } from '../../types';
import { contractDaysLeft, employmentStatus } from '../../utils/employmentStatus';
import { formatDate } from '../../utils/format';
import { CreateEmployeeModal } from './CreateEmployeeModal';

type StatusFilter = 'active' | 'inactive' | 'all';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Active employees', value: 'active' },
  { label: 'Inactive (offboarded)', value: 'inactive' },
  { label: 'All employees', value: 'all' },
];

const IT_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];

export function EmployeeList() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = IT_ROLES.includes(identity?.role ?? '');
  const { freshInstall } = useSetupStatus();
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  // Command palette "New employee" jumps here with ?action=new so the create modal opens
  // without a dedicated /employees/create route.
  useEffect(() => {
    if (canManage && searchParams.get('action') === 'new') {
      setCreateOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('action');
          return next;
        },
        { replace: true },
      );
    }
  }, [canManage, searchParams, setSearchParams]);
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

  const hasNarrowing = Boolean(
    active.q ||
      active.locationId ||
      active.departmentId ||
      active.contractEndingInDays ||
      active.incompleteChecklist,
  );
  const followUp = active.contractEndingInDays
    ? 'contracts'
    : active.incompleteChecklist === 'true'
      ? 'checklist'
      : undefined;

  return (
    <Card
      title={<Typography.Text strong>Employees</Typography.Text>}
      extra={
        canManage ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Add employee
          </Button>
        ) : null
      }
    >
      <CreateEmployeeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          void tableQuery.refetch();
        }}
      />
      <div className="nv-filter-row">
        <Input.Search
          placeholder="Search name or employee ID…"
          allowClear
          aria-label="Search employees"
          style={{ width: 260, flex: '0 0 260px' }}
          key={String(active.q ?? '')}
          defaultValue={(active.q as string | undefined) ?? ''}
          onSearch={(v) => setFilter('q', v.trim())}
        />
        <ChipSelect<StatusFilter>
          label="Status"
          tone="status"
          aria-label="Filter by employment status"
          value={statusValue}
          options={STATUS_OPTIONS}
          onChange={(v) =>
            setFilter('isActive', v === 'active' ? 'true' : v === 'inactive' ? 'false' : undefined)
          }
        />
        <ChipSelect
          label="Type"
          tone="category"
          allowClear
          aria-label="Filter by employment type"
          placeholder="All types"
          options={[
            { label: 'Permanent', value: 'permanent' },
            { label: 'Contract', value: 'contract' },
          ]}
          value={active.employmentType as 'permanent' | 'contract' | undefined}
          onChange={(v) => setFilter('employmentType', v)}
        />
        <ChipSelect
          label="Follow-up"
          tone="status"
          allowClear
          aria-label="Filter by follow-up"
          placeholder="None"
          options={[
            { label: 'Contracts ending (14d)', value: 'contracts' },
            { label: 'Incomplete checklist', value: 'checklist' },
          ]}
          value={followUp}
          onChange={(v) => {
            setFilters(
              [
                {
                  field: 'contractEndingInDays',
                  operator: 'eq',
                  value: v === 'contracts' ? 14 : undefined,
                },
                {
                  field: 'incompleteChecklist',
                  operator: 'eq',
                  value: v === 'checklist' ? 'true' : undefined,
                },
              ],
              'merge',
            );
          }}
        />
        <ChipSelect
          label="Location"
          tone="location"
          allowClear
          aria-label="Filter by location"
          placeholder="All"
          options={locations.map((l) => ({ label: l.name, value: l.id }))}
          value={active.locationId ? Number(active.locationId) : undefined}
          onChange={(v) => setFilter('locationId', v)}
        />
        <ChipSelect
          label="Department"
          tone="department"
          allowClear
          aria-label="Filter by department"
          placeholder="All"
          options={departments.map((d) => ({ label: d.name, value: d.id }))}
          value={active.departmentId ? Number(active.departmentId) : undefined}
          onChange={(v) => setFilter('departmentId', v)}
        />
      </div>
      {followUp === 'contracts' && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Showing active contractors whose contract ends within 14 days."
        />
      )}
      {followUp === 'checklist' && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Showing employees with an onboard or offboard checklist that still has open items."
        />
      )}
      {tableQuery.isLoading ? (
        <TableSkeleton columns={5} />
      ) : tableQuery.isError ? (
        <EmptyState
          description="Could not load employees. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void tableQuery.refetch()}
        />
      ) : rows.length === 0 &&
        !tableQuery.isFetching &&
        freshInstall &&
        !hasNarrowing &&
        statusValue !== 'inactive' ? (
        <FirstRunWelcome />
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
                      { field: 'contractEndingInDays', operator: 'eq', value: undefined },
                      { field: 'incompleteChecklist', operator: 'eq', value: undefined },
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
            quickFilter={false}
            onRow={(record) => ({
              onClick: () => navigate(`/employees/show/${record.id}`),
            })}
            rowClassName={(r) => (r.isActive === false ? 'nv-row-inactive' : '')}
            columns={[
              {
                title: 'Employee',
                gridKey: 'employee',
                dataIndex: 'lastName',
                defaultWidth: 280,
                sorter: true,
                render: (_, r) => (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                    <PrimaryWithSub
                      primary={`${r.firstName} ${r.lastName}`}
                      sub={
                        <span>
                          {r.employeeCode}
                          {r.incompleteChecklistKind ? (
                            <Tag color="warning" style={{ marginLeft: 6 }}>
                              {r.incompleteChecklistKind === 'offboard' ? 'Offboard' : 'Onboard'}{' '}
                              incomplete
                            </Tag>
                          ) : null}
                          {r.employmentType === 'contract' &&
                          contractDaysLeft(r.contractEndDate) !== null &&
                          (contractDaysLeft(r.contractEndDate) as number) >= 0 &&
                          (contractDaysLeft(r.contractEndDate) as number) <= 14 ? (
                            <Tag color="orange" style={{ marginLeft: 6 }}>
                              Contract ends {formatDate(r.contractEndDate)}
                            </Tag>
                          ) : null}
                        </span>
                      }
                    />
                    <CopyButton value={r.employeeCode} label="employee code" />
                  </div>
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
                defaultWidth: 140,
                sorter: true,
                render: (_: boolean | undefined, r) => (
                  <Tag color={employmentStatus(r).color}>{employmentStatus(r).label}</Tag>
                ),
                getExportValue: (r) => employmentStatus(r).label,
              },
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
    </Card>
  );
}
