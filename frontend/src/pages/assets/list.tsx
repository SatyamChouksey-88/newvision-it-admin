import {
  DownloadOutlined,
  PlusOutlined,
  SwapOutlined,
  UploadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PrimaryWithSub, WarrantyDays } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { EmptyState } from '../../components/EmptyState';
import { FirstRunWelcome } from '../../components/FirstRunWelcome';
import { ChipSelect } from '../../components/ChipSelect';
import { AssetStatusSelect } from '../../components/AssetStatusSelect';
import { ASSET_STATUS_OPTIONS, StatusTag } from '../../components/StatusTag';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import { useSetupStatus } from '../../hooks/useSetupStatus';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { tabularNums } from '../../theme';
import type {
  Asset,
  AssetCategory,
  AssetStatus,
  Department,
  Location,
  SavedView,
} from '../../types';
import { formatCurrency } from '../../utils/format';
import { AssignModal, TransferModal } from './actions';

const IT_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];

export function AssetList() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = IT_ROLES.includes(identity?.role ?? '');
  const { freshInstall } = useSetupStatus();

  const { tableProps, filters, setFilters, tableQuery } = useTable<Asset>({
    resource: 'assets',
    syncWithLocation: true,
    pagination: { pageSize: 25 },
  });

  const [density, setDensity] = useState<TableDensity>('Compact');
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);
  const [assignTarget, setAssignTarget] = useState<Asset | null>(null);
  const [transferTarget, setTransferTarget] = useState<Asset | null>(null);
  const [retireTarget, setRetireTarget] = useState<Asset | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState<null | 'status' | 'transfer' | 'retire'>(null);
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  // Single source of truth for filters is Refine's state (which is synced to the URL). This keeps
  // the dropdowns, chips, export and saved views consistent with deep links such as the dashboard
  // KPI drill-downs (`/assets?filters[0][field]=status…`).
  const activeFilters = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of filters ?? []) {
      if ('field' in f && f.value !== undefined && f.value !== null && f.value !== '') {
        out[f.field] = f.value;
      }
    }
    return out;
  }, [filters]);
  const activeFilterCount = Object.keys(activeFilters).length;

  useEffect(() => {
    const load = async () => {
      const [loc, cat, dep, sv] = await Promise.allSettled([
        httpClient.get('/locations', { params: { _start: 0, _end: 100 } }),
        httpClient.get('/asset-categories', { params: { _start: 0, _end: 100 } }),
        httpClient.get('/departments', { params: { _start: 0, _end: 100 } }),
        httpClient.get('/saved-views', { params: { resource: 'assets', _start: 0, _end: 50 } }),
      ]);
      if (loc.status === 'fulfilled') setLocations(loc.value.data.data ?? []);
      if (cat.status === 'fulfilled') setCategories(cat.value.data.data ?? []);
      if (dep.status === 'fulfilled') setDepartments(dep.value.data.data ?? []);
      if (sv.status === 'fulfilled') setViews(sv.value.data.data ?? []);
    };
    void load();
  }, []);

  const applyFilterState = (next: Record<string, unknown>) => {
    setFilters(
      Object.entries(next)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([field, value]) => ({
          field,
          operator: field === 'q' ? ('contains' as const) : ('eq' as const),
          value,
        })),
      'replace',
    );
    setSelectedIds([]);
  };

  const setFilter = (field: string, value: unknown) =>
    applyFilterState({ ...activeFilters, [field]: value ?? undefined });

  const clearFilters = () => applyFilterState({});

  const changeStatus = async (asset: Asset, status: AssetStatus) => {
    try {
      await httpClient.post(`/assets/${asset.id}/status`, { status });
      message.success(`${asset.assetCode}: ${asset.status} → ${status}`);
      tableQuery.refetch();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not change status'));
    }
  };

  const retire = async (asset: Asset, reason?: string) => {
    try {
      await httpClient.post(`/assets/${asset.id}/retire`, { reason: reason || undefined });
      message.success(`Retired ${asset.assetCode}`);
      setRetireTarget(null);
      tableQuery.refetch();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Failed to retire asset'));
    }
  };

  const saveCurrentView = async (name: string) => {
    try {
      const { data } = await httpClient.post('/saved-views', {
        name,
        resource: 'assets',
        filters: activeFilters,
        isShared: true,
      });
      setViews((v) => [data, ...v]);
      setSaveViewOpen(false);
      message.success(`Saved view "${name}"`);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not save the view'));
    }
  };

  const runBulk = async (
    action: 'status' | 'transfer' | 'retire',
    extra: Record<string, unknown> = {},
  ) => {
    try {
      const { data } = await httpClient.post('/assets/bulk', {
        ids: selectedIds,
        action,
        ...extra,
      });
      if (data.failed > 0) {
        const firstError = data.results?.find((r: { ok: boolean }) => !r.ok)?.error;
        message.warning(
          `Bulk ${action}: ${data.succeeded} succeeded, ${data.failed} failed${firstError ? ` — ${firstError}` : ''}`,
        );
      } else {
        message.success(
          `Bulk ${action}: ${data.succeeded} asset${data.succeeded === 1 ? '' : 's'} updated`,
        );
      }
      setSelectedIds([]);
      setBulkOpen(null);
      tableQuery.refetch();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Bulk action failed'));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await httpClient.get('/export/assets', {
        params: { format: 'csv', ...activeFilters },
        responseType: 'blob',
      });
      const count = res.headers['x-row-count'];
      const filename =
        res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ?? 'assets_export.csv';
      downloadBlob(res.data, filename);
      toast.success(`Exported ${count ?? 'all matching'} rows to ${filename}`);
    } catch (e) {
      // Blob error bodies need to be read back to text before we can show the API message.
      const blob = (e as { response?: { data?: Blob } })?.response?.data;
      let detail = 'Nothing to export — adjust filters or add assets';
      if (blob instanceof Blob) {
        try {
          const parsed = JSON.parse(await blob.text());
          if (typeof parsed?.message === 'string') detail = parsed.message;
        } catch {
          /* keep default */
        }
      }
      toast.error(detail);
    }
  };

  const importProps = useMemo(
    () => ({
      accept: '.csv,.xlsx',
      showUploadList: false,
      customRequest: async (opt: any) => {
        const form = new FormData();
        form.append('file', opt.file);
        try {
          const { data } = await httpClient.post('/import/assets', form);
          if (data.failed > 0) {
            const first = data.errors?.[0];
            message.warning(
              `Imported ${data.created}/${data.total} rows — ${data.failed} failed${first ? ` (row ${first.row}: ${first.message})` : ''}. See Settings → Import jobs for details.`,
              8,
            );
          } else {
            message.success(`Imported ${data.created}/${data.total} rows`);
          }
          tableQuery.refetch();
          opt.onSuccess?.(data);
        } catch (e) {
          message.error(apiErrorMessage(e, 'Import failed'));
          opt.onError?.(e as Error);
        }
      },
    }),
    [message, tableQuery],
  );

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    const statusLabel = (v: unknown) =>
      ASSET_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
    for (const [k, v] of Object.entries(activeFilters)) {
      switch (k) {
        case 'q':
          chips.push({ key: k, label: `Search: “${String(v)}”` });
          break;
        case 'status':
          chips.push({ key: k, label: `Status: ${statusLabel(v)}` });
          break;
        case 'locationId':
          chips.push({
            key: k,
            label: `Location: ${locations.find((l) => l.id === Number(v))?.name ?? v}`,
          });
          break;
        case 'categoryId':
          chips.push({
            key: k,
            label: `Category: ${categories.find((c) => c.id === Number(v))?.name ?? v}`,
          });
          break;
        case 'departmentId':
          chips.push({
            key: k,
            label: `Department: ${departments.find((d) => d.id === Number(v))?.name ?? v}`,
          });
          break;
        case 'warrantyExpiringInDays':
          chips.push({ key: k, label: `Warranty ends within ${String(v)} days` });
          break;
        case 'assignedEmployeeId':
          chips.push({ key: k, label: `Assigned to employee #${String(v)}` });
          break;
        default:
          chips.push({ key: k, label: `${k}: ${String(v)}` });
      }
    }
    return chips;
  }, [activeFilters, locations, categories, departments]);

  return (
    <Card
      title={<Typography.Text strong>Assets</Typography.Text>}
      extra={
        <Space>
          {canManage && selectedIds.length > 0 && (
            <>
              <Typography.Text type="secondary">{selectedIds.length} selected</Typography.Text>
              <Button size="small" onClick={() => setBulkOpen('status')}>
                Bulk status
              </Button>
              <Button size="small" onClick={() => setBulkOpen('transfer')}>
                Bulk transfer
              </Button>
              <Button size="small" danger onClick={() => setBulkOpen('retire')}>
                Bulk retire
              </Button>
            </>
          )}
          {canManage && (
            <>
              <Upload {...importProps}>
                <Button size="small" icon={<UploadOutlined />}>
                  Import
                </Button>
              </Upload>
              <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>
                Export
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/assets/create')}
              >
                New Asset
              </Button>
            </>
          )}
        </Space>
      }
    >
      <div className="nv-filter-row">
        <Input.Search
          aria-label="Search assets"
          placeholder="Search code, serial, model…"
          allowClear
          style={{ width: 260 }}
          key={String(activeFilters.q ?? '')}
          defaultValue={(activeFilters.q as string | undefined) ?? ''}
          onSearch={(v) => setFilter('q', v.trim())}
        />
        <ChipSelect
          label="Status"
          tone="status"
          allowClear
          aria-label="Filter by status"
          placeholder="All"
          options={ASSET_STATUS_OPTIONS}
          value={activeFilters.status as AssetStatus | undefined}
          onChange={(v) => setFilter('status', v)}
        />
        <ChipSelect
          label="Location"
          tone="location"
          allowClear
          aria-label="Filter by location"
          placeholder="All"
          options={locations.map((l) => ({ label: l.name, value: l.id }))}
          value={activeFilters.locationId as number | undefined}
          onChange={(v) => setFilter('locationId', v)}
        />
        <ChipSelect
          label="Category"
          tone="category"
          allowClear
          aria-label="Filter by category"
          placeholder="All"
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
          value={activeFilters.categoryId as number | undefined}
          onChange={(v) => setFilter('categoryId', v)}
        />
        <ChipSelect
          label="Department"
          tone="department"
          allowClear
          aria-label="Filter by department"
          placeholder="All"
          options={departments.map((d) => ({ label: d.name, value: d.id }))}
          value={activeFilters.departmentId as number | undefined}
          onChange={(v) => setFilter('departmentId', v)}
        />
        <Select
          allowClear
          aria-label="Saved view"
          placeholder="Saved view"
          style={{ width: 180 }}
          options={views.map((v) => ({ label: v.name, value: v.id }))}
          onChange={(id) => {
            const view = views.find((v) => v.id === id);
            if (view) applyFilterState(view.filters);
          }}
        />
        <Button
          size="small"
          disabled={activeFilterCount === 0}
          onClick={() => setSaveViewOpen(true)}
        >
          Save view
        </Button>
      </div>
      {filterChips.length > 0 && (
        <Space wrap size={[4, 4]} style={{ marginBottom: 12 }} aria-label="Active filters">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Filtered by
          </Typography.Text>
          {filterChips.map((chip) => (
            <Tag
              key={chip.key}
              closable
              onClose={(e) => {
                e.preventDefault();
                setFilter(chip.key, undefined);
              }}
              closeIcon={
                <span role="img" aria-label={`Remove filter ${chip.label}`}>
                  ×
                </span>
              }
            >
              {chip.label}
            </Tag>
          ))}
          <Button type="link" size="small" onClick={clearFilters}>
            Clear all
          </Button>
        </Space>
      )}
      {tableQuery.isLoading ? (
        <TableSkeleton columns={7} />
      ) : tableQuery.isError ? (
        <EmptyState
          description="Could not load assets. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void tableQuery.refetch()}
        />
      ) : rows.length === 0 && freshInstall && activeFilterCount === 0 ? (
        <FirstRunWelcome />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            activeFilterCount > 0 ? 'No assets match the current filters' : 'No assets yet'
          }
          actionLabel={
            activeFilterCount > 0 ? 'Clear filters' : canManage ? 'Create asset' : undefined
          }
          onAction={
            activeFilterCount > 0
              ? clearFilters
              : canManage
                ? () => navigate('/assets/create')
                : undefined
          }
        />
      ) : (
        <DataGrid<Asset>
          tableKey="assets"
          searchInputId="assets-grid-search"
          dataSource={rows}
          loading={tableQuery.isFetching}
          rowKey="id"
          density={density}
          onDensityChange={setDensity}
          fixFirstColumn
          serverSide
          onChange={tableProps.onChange}
          onExport={exportCsv}
          exportFilename="assets_export.csv"
          scroll={{ x: 1600 }}
          quickFilter={false}
          rowSelection={
            canManage
              ? {
                  selectedRowKeys: selectedIds,
                  onChange: (keys) => setSelectedIds(keys as number[]),
                  columnTitle: (checkbox) => (
                    <span title="Select all assets">{checkbox}</span>
                  ),
                }
              : undefined
          }
          bulkActions={
            canManage && selectedIds.length > 0 ? (
              <Space size={4}>
                <Button size="small" onClick={() => setBulkOpen('status')}>
                  Bulk status
                </Button>
                <Button size="small" onClick={() => setBulkOpen('transfer')}>
                  Bulk transfer
                </Button>
                <Button size="small" danger onClick={() => setBulkOpen('retire')}>
                  Bulk retire
                </Button>
              </Space>
            ) : undefined
          }
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys(keys as number[]),
            expandedRowRender: (r) => (
              <div style={{ fontSize: 12, color: '#595959' }}>
                Serial: {r.serialNumber ?? '—'} · Department: {r.department?.name ?? '—'} · Warranty
                end: {r.warrantyEnd ? new Date(r.warrantyEnd).toLocaleDateString() : '—'}
              </div>
            ),
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/assets/show/${record.id}`),
          })}
          columns={[
            {
              title: 'Asset',
              dataIndex: 'assetCode',
              sorter: true,
              render: (_, r) => (
                <Space size={4}>
                  <PrimaryWithSub
                    primary={r.assetCode}
                    sub={`${r.brand ?? ''} ${r.model ?? ''}`.trim() || r.serialNumber}
                  />
                  {canManage ? <CopyButton value={r.assetCode} label="asset code" /> : null}
                </Space>
              ),
            },
            {
              title: 'Category',
              dataIndex: ['category', 'name'],
              render: (_, r) => r.category?.name ?? '—',
            },
            {
              title: 'Location',
              dataIndex: ['location', 'code'],
              render: (_, r) => r.location?.code ?? '—',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              sorter: true,
              defaultWidth: 180,
              render: (_, r) =>
                canManage ? (
                  <AssetStatusSelect value={r.status} onChange={(next) => void changeStatus(r, next)} />
                ) : (
                  <StatusTag status={r.status} />
                ),
              getExportValue: (r) => r.status,
            },
            {
              title: 'Assigned To',
              gridKey: 'assignedTo',
              render: (_, r) =>
                r.assignedEmployee ? (
                  <Link
                    to={`/employees/show/${r.assignedEmployee.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {`${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName} · ${r.assignedEmployee.employeeCode}`}
                  </Link>
                ) : (
                  '—'
                ),
              getExportValue: (r) =>
                r.assignedEmployee
                  ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName} (${r.assignedEmployee.employeeCode})`
                  : '',
            },
            {
              title: 'Warranty',
              dataIndex: 'warrantyEnd',
              sorter: true,
              render: (_, r) => <WarrantyDays warrantyEnd={r.warrantyEnd} />,
            },
            {
              title: 'Cost',
              dataIndex: 'purchaseCost',
              align: 'right',
              sorter: true,
              render: (v) => <span style={tabularNums}>{formatCurrency(v)}</span>,
            },
            {
              title: 'Serial',
              dataIndex: 'serialNumber',
              defaultVisible: false,
              sorter: true,
              render: (v) => v ?? '—',
            },
            {
              title: 'Condition',
              dataIndex: 'condition',
              defaultVisible: false,
              sorter: true,
            },
            {
              title: 'Department',
              dataIndex: ['department', 'name'],
              defaultVisible: false,
              render: (_, r) => r.department?.name ?? '—',
            },
            ...(canManage
              ? [
                  {
                    title: 'Actions',
                    fixed: 'right' as const,
                    width: 190,
                    render: (_: unknown, r: Asset) => (
                      <Space size={4} onClick={(e) => e.stopPropagation()} role="presentation">
                        <Button
                          size="small"
                          icon={<UserAddOutlined />}
                          disabled={!['available', 'pending_assignment'].includes(r.status)}
                          onClick={() => setAssignTarget(r)}
                        >
                          Assign
                        </Button>
                        <Button
                          size="small"
                          icon={<SwapOutlined />}
                          disabled={r.status !== 'assigned'}
                          onClick={() => setTransferTarget(r)}
                        >
                          Transfer
                        </Button>
                        <Button
                          size="small"
                          danger
                          disabled={['retired', 'disposed'].includes(r.status)}
                          onClick={() => setRetireTarget(r)}
                        >
                          Retire
                        </Button>
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      {!tableQuery.isLoading && total > 0 && (
        <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
      )}

      <AssignModal
        asset={assignTarget}
        onClose={() => setAssignTarget(null)}
        onDone={() => {
          setAssignTarget(null);
          tableQuery.refetch();
        }}
      />
      <TransferModal
        asset={transferTarget}
        locations={locations}
        onClose={() => setTransferTarget(null)}
        onDone={() => {
          setTransferTarget(null);
          tableQuery.refetch();
        }}
      />
      <BulkActionModal
        mode={bulkOpen}
        count={selectedIds.length}
        locations={locations}
        onClose={() => setBulkOpen(null)}
        onRun={runBulk}
      />
      <RetireModal asset={retireTarget} onClose={() => setRetireTarget(null)} onConfirm={retire} />
      <SaveViewModal
        open={saveViewOpen}
        summary={filterChips.map((c) => c.label).join(' · ')}
        onClose={() => setSaveViewOpen(false)}
        onSave={saveCurrentView}
      />
    </Card>
  );
}

function RetireModal({
  asset,
  onClose,
  onConfirm,
}: {
  asset: Asset | null;
  onClose: () => void;
  onConfirm: (asset: Asset, reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={!!asset}
      title={`Retire ${asset?.assetCode ?? ''}?`}
      okText="Retire"
      okButtonProps={{ danger: true, loading: busy }}
      onCancel={onClose}
      afterClose={() => setReason('')}
      onOk={async () => {
        if (!asset) return;
        setBusy(true);
        try {
          await onConfirm(asset, reason.trim());
        } finally {
          setBusy(false);
        }
      }}
    >
      <Typography.Paragraph type="secondary">
        The asset is removed from service and any open assignment is closed. This is recorded in the
        audit log and cannot be undone from the list.
      </Typography.Paragraph>
      <Form layout="vertical">
        <Form.Item label="Reason (optional)">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. End of life, replaced by newer model"
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SaveViewModal({
  open,
  summary,
  onClose,
  onSave,
}: {
  open: boolean;
  summary: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      title="Save current filters as a view"
      okText="Save view"
      okButtonProps={{ disabled: !name.trim(), loading: busy }}
      onCancel={onClose}
      afterClose={() => setName('')}
      onOk={async () => {
        setBusy(true);
        try {
          await onSave(name.trim());
        } finally {
          setBusy(false);
        }
      }}
    >
      <Form layout="vertical">
        <Form.Item label="View name" required>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mumbai laptops under repair"
            maxLength={60}
            onPressEnter={() => name.trim() && void onSave(name.trim())}
          />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Filters: {summary || 'none'}
        </Typography.Text>
      </Form>
    </Modal>
  );
}

function BulkActionModal({
  mode,
  count,
  locations,
  onClose,
  onRun,
}: {
  mode: null | 'status' | 'transfer' | 'retire';
  count: number;
  locations: Location[];
  onClose: () => void;
  onRun: (action: 'status' | 'transfer' | 'retire', extra?: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<AssetStatus>('retired');
  const [toLocationId, setToLocationId] = useState<number | undefined>();
  const [toEmployeeId, setToEmployeeId] = useState<number | undefined>();
  const transferInvalid = mode === 'transfer' && !toLocationId && !toEmployeeId;
  const noun = `${count} asset${count === 1 ? '' : 's'}`;

  return (
    <Modal
      open={!!mode}
      title={
        mode === 'status'
          ? `Change status of ${noun}`
          : mode === 'transfer'
            ? `Transfer ${noun}`
            : `Retire ${noun}`
      }
      onCancel={onClose}
      afterClose={() => {
        setToLocationId(undefined);
        setToEmployeeId(undefined);
      }}
      onOk={() => {
        if (mode === 'status') onRun('status', { status });
        else if (mode === 'transfer') onRun('transfer', { toLocationId, toEmployeeId });
        else onRun('retire');
      }}
      okText="Apply"
      okButtonProps={{ danger: mode === 'retire', disabled: transferInvalid }}
    >
      {mode === 'status' && (
        <Select
          style={{ width: '100%' }}
          options={ASSET_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      )}
      {mode === 'transfer' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            allowClear
            placeholder="Target location"
            style={{ width: '100%' }}
            value={toLocationId}
            onChange={setToLocationId}
            options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
          />
          <EmployeeSelect
            value={toEmployeeId}
            onChange={setToEmployeeId}
            placeholder="Target employee"
          />
        </Space>
      )}
      {mode === 'transfer' && transferInvalid && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          Choose a target location and/or employee.
        </Typography.Text>
      )}
      {mode === 'retire' && (
        <Typography.Paragraph>
          Retire the selected assets? Assets that are already retired/disposed, or that cannot move
          to retired from their current status, are skipped and reported.
        </Typography.Paragraph>
      )}
    </Modal>
  );
}

function downloadBlob(data: BlobPart, filename: string) {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
