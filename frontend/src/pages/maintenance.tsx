import { PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AssetSelect } from '../components/AssetSelect';
import { CopyButton } from '../components/CopyButton';
import { DataGrid, type TableDensity } from '../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../components/EmployeeSelect';
import { EmptyState } from '../components/EmptyState';
import { MaintenanceStatusSelect, MaintenanceStatusTag } from '../components/MaintenanceStatusTag';
import { ManualEditButton } from '../components/ManualEdit';
import { RecordNotes } from '../components/RecordNotes';
import { StatusLegend } from '../components/StatusLegend';
import { TablePagination } from '../components/TablePagination';
import { TableSkeleton } from '../components/TableSkeleton';
import { useRefinePagination } from '../hooks/useRefinePagination';
import type { Identity } from '../providers/authProvider';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { tabularNums } from '../theme';
import type { Maintenance, MaintenanceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

const VIEW_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];
const MANUAL_ROLES = ['SUPER_ADMIN', 'IT_ADMIN'];

export function MaintenancePage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const canView = VIEW_ROLES.includes(identity?.role ?? '');
  const canManual = MANUAL_ROLES.includes(identity?.role ?? '');

  const { tableProps, setFilters, filters, tableQuery } = useTable<Maintenance>({
    resource: 'maintenance',
    syncWithLocation: true,
    pagination: { pageSize: 25 },
    queryOptions: { enabled: canView },
  });
  const statusFilter = useMemo(() => {
    const f = filters.find((x) => 'field' in x && x.field === 'status');
    const v = f && 'value' in f ? f.value : undefined;
    return v ? (String(v) as MaintenanceStatus) : undefined;
  }, [filters]);
  const qFilter = useMemo(() => {
    const f = filters.find((x) => 'field' in x && x.field === 'q');
    return f && 'value' in f ? String(f.value ?? '') : '';
  }, [filters]);
  const staleDaysFilter = useMemo(() => {
    const f = filters.find((x) => 'field' in x && x.field === 'staleDays');
    const v = f && 'value' in f ? Number(f.value) : 0;
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, [filters]);

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Maintenance | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Maintenance | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [density, setDensity] = useState<TableDensity>('Compact');
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  const refetch = () => tableQuery.refetch();

  const loadCounts = useCallback(async () => {
    if (!canView) return;
    const statuses: (MaintenanceStatus | undefined)[] = [
      undefined,
      'reported',
      'under_repair',
      'repaired',
      'reassigned',
    ];
    const pairs = await Promise.all(
      statuses.map((s) =>
        httpClient
          .get('/maintenance', {
            params: { _start: 0, _end: 1, ...(s ? { status: s } : {}) },
          })
          .then((r) => [s ?? 'all', r.data.total ?? 0] as const)
          .catch(() => [s ?? 'all', 0] as const),
      ),
    );
    setStatusCounts(Object.fromEntries(pairs));
  }, [canView]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const transition = async (
    row: Maintenance,
    status: MaintenanceStatus,
    body: Record<string, unknown> = {},
  ) => {
    try {
      await httpClient.patch(`/maintenance/${row.id}/transition`, { status, ...body });
      message.success(`Ticket #${row.id} → ${status.replace('_', ' ')}`);
      refetch();
      void loadCounts();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not update the ticket'));
    }
  };

  return (
    <Card
      title={<Typography.Text strong>Maintenance &amp; Repairs</Typography.Text>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setReportOpen(true)}>
          Report Issue
        </Button>
      }
    >
      {canView ? (
        <div className="nv-filter-row">
          <Input.Search
            id="maintenance-grid-search"
            allowClear
            placeholder="Search issue, vendor, ticket #…"
            aria-label="Search maintenance"
            key={qFilter}
            defaultValue={qFilter}
            onSearch={(v) =>
              setFilters(
                [{ field: 'q', operator: 'contains', value: v.trim() || undefined }],
                'merge',
              )
            }
          />
          <div className="nv-status-chips" role="tablist" aria-label="Maintenance status">
            {(
              [
                ['all', 'All'],
                ['reported', 'Reported'],
                ['under_repair', 'Under repair'],
                ['repaired', 'Repaired'],
                ['reassigned', 'Reassigned'],
              ] as const
            ).map(([key, label]) => {
              const active = key === 'all' ? !statusFilter : statusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`nv-status-chip${active ? ' is-active' : ''}`}
                  onClick={() =>
                    setFilters(
                      [
                        {
                          field: 'status',
                          operator: 'eq',
                          value: key === 'all' ? undefined : key,
                        },
                      ],
                      'merge',
                    )
                  }
                >
                  {label}
                  <span className="nv-status-chip-count">{statusCounts[key] ?? '—'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {staleDaysFilter > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`Showing open repairs reported ${staleDaysFilter}+ days ago.`}
          action={
            <Button
              size="small"
              onClick={() =>
                setFilters([{ field: 'staleDays', operator: 'eq', value: undefined }], 'merge')
              }
            >
              Clear
            </Button>
          }
        />
      ) : null}
      {canView ? (
        tableQuery.isLoading ? (
          <TableSkeleton columns={8} />
        ) : tableQuery.isError ? (
          <EmptyState
            description="Could not load tickets."
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        ) : rows.length === 0 ? (
          statusFilter ? (
            <EmptyState
              description={`No ${statusFilter.replace('_', ' ')} tickets`}
              actionLabel="Clear filter"
              onAction={() =>
                setFilters([{ field: 'status', operator: 'eq', value: undefined }], 'merge')
              }
            />
          ) : (
            <EmptyState
              description="No maintenance tickets"
              actionLabel="Report issue"
              onAction={() => setReportOpen(true)}
            />
          )
        ) : (
          <>
            <DataGrid<Maintenance>
              tableKey="maintenance"
              searchInputId="maintenance-grid-search"
              rowKey="id"
              dataSource={rows}
              loading={tableQuery.isFetching}
              density={density}
              onDensityChange={setDensity}
              fixFirstColumn
              serverSide
              onChange={tableProps.onChange}
              scroll={{ x: 1000 }}
              toolbarExtra={<StatusLegend kind="maintenance" />}
              expandable={{
                expandedRowKeys: expanded,
                onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
                expandedRowRender: (r) => (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Notes: {r.notes ?? '—'} · Completed: {formatDate(r.completedAt)} · Reported
                      by: {r.reportedBy?.fullName ?? '—'}
                    </Typography.Text>
                    {canManual ? (
                      <ManualEditButton
                        entityType="AssetMaintenance"
                        id={r.id}
                        fields={[
                          { name: 'issue', label: 'Issue', value: r.issue },
                          { name: 'status', label: 'Status', value: r.status },
                          { name: 'vendor', label: 'Vendor', value: r.vendor },
                          { name: 'reportedAt', label: 'Reported at', value: r.reportedAt },
                        ]}
                        onSaved={() => void refetch()}
                      />
                    ) : null}
                    <RecordNotes entityType="AssetMaintenance" entityId={r.id} canAdd={canView} />
                  </Space>
                ),
              }}
              columns={[
                {
                  title: 'ID',
                  dataIndex: 'id',
                  defaultWidth: 72,
                  render: (v: number) => (
                    <Space size={4}>
                      {v}
                      <CopyButton value={String(v)} label="ticket id" />
                    </Space>
                  ),
                },
                {
                  title: 'Asset',
                  gridKey: 'asset',
                  render: (_, r) =>
                    r.asset ? (
                      <Space size={4}>
                        <Button
                          type="link"
                          style={{ padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assets/show/${r.asset?.id}`);
                          }}
                        >
                          {r.asset.assetCode}
                        </Button>
                        <CopyButton value={r.asset.assetCode} label="asset code" />
                      </Space>
                    ) : (
                      '—'
                    ),
                },
                { title: 'Issue', dataIndex: 'issue', ellipsis: true, defaultWidth: 260 },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  defaultWidth: 170,
                  render: (_, r) =>
                    canView ? (
                      <MaintenanceStatusSelect
                        value={r.status}
                        onChange={(next) => {
                          if (next === 'repaired') setCompleteTarget(r);
                          else if (next === 'reassigned') setReassignTarget(r);
                          else void transition(r, next);
                        }}
                      />
                    ) : (
                      <MaintenanceStatusTag status={r.status} />
                    ),
                  getExportValue: (r) => r.status,
                },
                { title: 'Vendor', dataIndex: 'vendor', render: (v) => v || '—' },
                {
                  title: 'Est. Cost',
                  dataIndex: 'estimatedCost',
                  align: 'right',
                  render: (v) => <span style={tabularNums}>{formatCurrency(v)}</span>,
                },
                {
                  title: 'Actual Cost',
                  dataIndex: 'actualCost',
                  align: 'right',
                  render: (v) => <span style={tabularNums}>{formatCurrency(v)}</span>,
                },
                {
                  title: 'Reported',
                  dataIndex: 'reportedAt',
                  render: (v) => formatDate(v),
                },
                {
                  title: 'Expected',
                  dataIndex: 'expectedCompletionDate',
                  render: (v) => formatDate(v),
                },
                {
                  title: 'Actions',
                  gridKey: 'actions',
                  exportable: false,
                  defaultWidth: 230,
                  render: (_, r) => (
                    <Space size={4}>
                      {r.status === 'reported' && (
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            void transition(r, 'under_repair');
                          }}
                        >
                          Start Repair
                        </Button>
                      )}
                      {r.status === 'under_repair' && (
                        <Button
                          size="small"
                          type="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompleteTarget(r);
                          }}
                        >
                          Mark Repaired
                        </Button>
                      )}
                      {r.status === 'repaired' && (
                        <Button
                          size="small"
                          type="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReassignTarget(r);
                          }}
                        >
                          Reassign
                        </Button>
                      )}
                      {(r.status === 'reported' || r.status === 'under_repair') && (
                        <Popconfirm
                          title="Cancel this ticket?"
                          onConfirm={() => transition(r, 'cancelled')}
                        >
                          <Button size="small" danger onClick={(e) => e.stopPropagation()}>
                            Cancel
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              onChange={onPageChange}
            />
          </>
        )
      ) : (
        <Typography.Paragraph type="secondary">
          <ToolOutlined /> Use <b>Report Issue</b> to raise a repair request for an asset assigned
          to you. The IT team will triage and track it here.
        </Typography.Paragraph>
      )}

      <ReportIssueModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onDone={() => {
          setReportOpen(false);
          if (canView) refetch();
        }}
      />
      <CompleteModal
        ticket={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onDone={(actualCost, notes) => {
          const t = completeTarget;
          setCompleteTarget(null);
          if (t) transition(t, 'repaired', { actualCost, notes });
        }}
      />
      <ReassignModal
        ticket={reassignTarget}
        onClose={() => setReassignTarget(null)}
        onDone={(toEmployeeId) => {
          const t = reassignTarget;
          setReassignTarget(null);
          if (t) transition(t, 'reassigned', toEmployeeId ? { toEmployeeId } : {});
        }}
      />
    </Card>
  );
}

// --------------------------------------------------------------------- modals

function ReportIssueModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      const v = await form.validateFields();
      setLoading(true);
      await httpClient.post('/maintenance', {
        assetId: v.assetId,
        issue: v.issue,
        vendor: v.vendor || undefined,
        estimatedCost: v.estimatedCost ?? undefined,
        expectedCompletionDate: v.expectedCompletionDate
          ? v.expectedCompletionDate.toISOString()
          : undefined,
      });
      message.success('Issue reported');
      form.resetFields();
      onDone();
    } catch (e) {
      if ((e as { errorFields?: unknown }).errorFields) return; // validation
      message.error(apiErrorMessage(e, 'Could not report the issue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Report an Issue"
      okText="Report"
      onCancel={onClose}
      onOk={submit}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="assetId" label="Asset" rules={[{ required: true }]}>
          <AssetSelect />
        </Form.Item>
        <Form.Item
          name="issue"
          label="Issue"
          rules={[{ required: true, min: 3, message: 'Describe the issue (min 3 chars)' }]}
        >
          <Input.TextArea rows={3} placeholder="e.g. Screen flickering intermittently" />
        </Form.Item>
        <Form.Item name="vendor" label="Vendor (optional)">
          <Input placeholder="e.g. Dell Service Center" />
        </Form.Item>
        <Form.Item name="estimatedCost" label="Estimated cost (₹, optional)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="expectedCompletionDate" label="Expected completion (optional)">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function CompleteModal({
  ticket,
  onClose,
  onDone,
}: {
  ticket: Maintenance | null;
  onClose: () => void;
  onDone: (actualCost: number | undefined, notes: string | undefined) => void;
}) {
  const [actualCost, setActualCost] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <Modal
      open={!!ticket}
      title={`Mark repaired — #${ticket?.id ?? ''}`}
      okText="Mark Repaired"
      onCancel={onClose}
      onOk={() => {
        onDone(actualCost ?? undefined, notes || undefined);
        setActualCost(null);
        setNotes('');
      }}
    >
      <Form layout="vertical">
        <Form.Item label="Actual cost (₹)">
          <InputNumber
            min={0}
            value={actualCost ?? undefined}
            onChange={(v) => setActualCost(v ?? null)}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="Notes">
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ReassignModal({
  ticket,
  onClose,
  onDone,
}: {
  ticket: Maintenance | null;
  onClose: () => void;
  onDone: (toEmployeeId: number | undefined) => void;
}) {
  const [employeeId, setEmployeeId] = useState<number | undefined>();
  return (
    <Modal
      open={!!ticket}
      title={`Reassign asset — #${ticket?.id ?? ''}`}
      okText="Reassign"
      onCancel={onClose}
      onOk={() => {
        onDone(employeeId);
        setEmployeeId(undefined);
      }}
    >
      <Typography.Paragraph type="secondary">
        Leave blank to return the asset to its previous holder.
      </Typography.Paragraph>
      <Form layout="vertical">
        <Form.Item label="Assign to">
          <EmployeeSelect
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="Previous holder"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
