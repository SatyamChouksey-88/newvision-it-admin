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
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { PrimaryWithSub, WarrantyDays } from '../../components/Cells';
import { EmptyState } from '../../components/EmptyState';
import { ASSET_STATUS_OPTIONS, StatusTag } from '../../components/StatusTag';
import { StatusLegend } from '../../components/StatusLegend';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { httpClient } from '../../providers/axios';
import { tabularNums } from '../../theme';
import type { Asset, AssetCategory, AssetStatus, Department, Location, SavedView } from '../../types';
import { formatCurrency } from '../../utils/format';
import { AssignModal, TransferModal } from './actions';

const IT_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];

export function AssetList() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = IT_ROLES.includes(identity?.role ?? '');

  const { tableProps, setFilters, tableQuery } = useTable<Asset>({
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
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState<null | 'status' | 'transfer' | 'retire'>(null);
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  useEffect(() => {
    httpClient
      .get('/locations', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setLocations(data.data ?? []));
    httpClient
      .get('/asset-categories', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setCategories(data.data ?? []));
    httpClient
      .get('/saved-views', { params: { resource: 'assets', _start: 0, _end: 50 } })
      .then(({ data }) => setViews(data.data ?? []));
    httpClient
      .get('/departments', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setDepartments(data.data ?? []));
  }, []);

  const applyFilterState = (next: Record<string, unknown>) => {
    setActiveFilters(next);
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
  };

  const setFilter = (field: string, value: unknown) =>
    applyFilterState({ ...activeFilters, [field]: value ?? undefined });

  const retire = async (asset: Asset) => {
    try {
      await httpClient.post(`/assets/${asset.id}/retire`, { reason: 'Retired from list view' });
      message.success(`Retired ${asset.assetCode}`);
      tableQuery.refetch();
    } catch {
      message.error('Failed to retire asset');
    }
  };

  const saveCurrentView = async () => {
    const name = window.prompt('Name this filter view');
    if (!name) return;
    try {
      const { data } = await httpClient.post('/saved-views', {
        name,
        resource: 'assets',
        filters: activeFilters,
        isShared: true,
      });
      setViews((v) => [data, ...v]);
      message.success(`Saved view "${name}"`);
    } catch {
      message.error('Could not save the view');
    }
  };

  const runBulk = async (action: 'status' | 'transfer' | 'retire', extra: Record<string, unknown> = {}) => {
    try {
      const { data } = await httpClient.post('/assets/bulk', {
        ids: selectedIds,
        action,
        ...extra,
      });
      message.success(`Bulk ${action}: ${data.succeeded} ok, ${data.failed} failed`);
      setSelectedIds([]);
      setBulkOpen(null);
      tableQuery.refetch();
    } catch {
      message.error('Bulk action failed');
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
      toast.success(`Exported ${count ?? 'filtered'} rows to ${filename}`);
    } catch {
      toast.error('Nothing to export — adjust filters or add assets');
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
          message.success(`Imported ${data.created}/${data.total} rows (${data.failed} failed)`);
          tableQuery.refetch();
          opt.onSuccess?.(data);
        } catch (e) {
          message.error('Import failed');
          opt.onError?.(e as Error);
        }
      },
    }),
    [message, tableQuery],
  );

  return (
    <Card
      title={
        <Space size="middle" wrap>
          <Typography.Text strong>Assets</Typography.Text>
          <StatusLegend />
          <Input.Search
            aria-label="Search assets"
            placeholder="Search code, serial, model…"
            allowClear
            style={{ width: 260 }}
            onSearch={(v) => setFilter('q', v)}
          />
          <Select
            allowClear
            aria-label="Filter by status"
            placeholder="Status"
            style={{ width: 170 }}
            options={ASSET_STATUS_OPTIONS}
            value={activeFilters.status as AssetStatus | undefined}
            onChange={(v) => setFilter('status', v)}
          />
          <Select
            allowClear
            aria-label="Filter by location"
            placeholder="Location"
            style={{ width: 170 }}
            options={locations.map((l) => ({ label: l.name, value: l.id }))}
            value={activeFilters.locationId as number | undefined}
            onChange={(v) => setFilter('locationId', v)}
          />
          <Select
            allowClear
            aria-label="Filter by category"
            placeholder="Category"
            style={{ width: 160 }}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
            value={activeFilters.categoryId as number | undefined}
            onChange={(v) => setFilter('categoryId', v)}
          />
          <Select
            allowClear
            aria-label="Filter by department"
            placeholder="Department"
            style={{ width: 160 }}
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
          <Button size="small" onClick={() => saveCurrentView()}>
            Save view
          </Button>
        </Space>
      }
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
      {tableQuery.isLoading ? (
        <TableSkeleton columns={7} />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No assets match the current filters"
          actionLabel={canManage ? 'Create asset' : undefined}
          onAction={canManage ? () => navigate('/assets/create') : undefined}
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
        scroll={{ x: 1100 }}
        rowSelection={
          canManage
            ? {
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as number[]),
                columnTitle: 'Select all assets',
                getCheckboxProps: (record) => ({
                  title: `Select asset ${record.assetCode}`,
                }),
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
                <CopyButton value={r.assetCode} label="asset code" />
                {r.serialNumber ? <CopyButton value={r.serialNumber} label="serial" /> : null}
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
            render: (_, r) => <StatusTag status={r.status} />,
          },
          {
            title: 'Assigned To',
            render: (_, r) =>
              r.assignedEmployee
                ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName}`
                : '—',
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
            render: (v) => <span style={tabularNums}>{formatCurrency(v)}</span>,
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
                      <Popconfirm
                        title="Retire this asset?"
                        onConfirm={() => retire(r)}
                        disabled={['retired', 'disposed'].includes(r.status)}
                      >
                        <Button
                          size="small"
                          danger
                          disabled={['retired', 'disposed'].includes(r.status)}
                        >
                          Retire
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      )}

      {!tableQuery.isLoading && total > 0 && (
        <TablePagination
          total={total}
          page={page}
          pageSize={pageSize}
          onChange={onPageChange}
        />
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
        locations={locations}
        onClose={() => setBulkOpen(null)}
        onRun={runBulk}
      />
    </Card>
  );
}

function BulkActionModal({
  mode,
  locations,
  onClose,
  onRun,
}: {
  mode: null | 'status' | 'transfer' | 'retire';
  locations: Location[];
  onClose: () => void;
  onRun: (action: 'status' | 'transfer' | 'retire', extra?: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<AssetStatus>('retired');
  const [toLocationId, setToLocationId] = useState<number | undefined>();
  const [toEmployeeId, setToEmployeeId] = useState<number | undefined>();

  return (
    <Modal
      open={!!mode}
      title={
        mode === 'status' ? 'Bulk status change' : mode === 'transfer' ? 'Bulk transfer' : 'Bulk retire'
      }
      onCancel={onClose}
      onOk={() => {
        if (mode === 'status') onRun('status', { status });
        else if (mode === 'transfer') onRun('transfer', { toLocationId, toEmployeeId });
        else onRun('retire');
      }}
      okText="Apply"
      okButtonProps={{ danger: mode === 'retire' }}
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
          <EmployeeSelect value={toEmployeeId} onChange={setToEmployeeId} placeholder="Target employee" />
        </Space>
      )}
      {mode === 'retire' && (
        <Typography.Paragraph>Retire the selected assets? This cannot be undone from the list.</Typography.Paragraph>
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
