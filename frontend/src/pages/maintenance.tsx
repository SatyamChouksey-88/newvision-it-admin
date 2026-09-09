import { PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AssetSelect } from '../components/AssetSelect';
import { CopyButton } from '../components/CopyButton';
import { DataGrid, type TableDensity } from '../components/DataGrid/DataGrid';
import { EmployeeSelect } from '../components/EmployeeSelect';
import { EmptyState } from '../components/EmptyState';
import {
  MAINTENANCE_STATUS_OPTIONS,
  MaintenanceStatusTag,
} from '../components/MaintenanceStatusTag';
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

export function MaintenancePage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const canView = VIEW_ROLES.includes(identity?.role ?? '');

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

  const [reportOpen, setReportOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Maintenance | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Maintenance | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [density, setDensity] = useState<TableDensity>('Compact');
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  const refetch = () => tableQuery.refetch();

  const transition = async (
    row: Maintenance,
    status: MaintenanceStatus,
    body: Record<string, unknown> = {},
  ) => {
    try {
      await httpClient.patch(`/maintenance/${row.id}/transition`, { status, ...body });
      message.success(`Ticket #${row.id} → ${status.replace('_', ' ')}`);
      refetch();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not update the ticket'));
    }
  };

  return (
    <Card
      title={
        <Space size="middle" wrap>
          <Typography.Text strong>Maintenance &amp; Repairs</Typography.Text>
          <StatusLegend kind="maintenance" />
          {canView && (
            <>
              <Input.Search
                allowClear
                placeholder="Search issue, vendor, ticket #…"
                aria-label="Search tickets"
                style={{ width: 260 }}
                key={qFilter}
                defaultValue={qFilter}
                onSearch={(v) =>
                  setFilters(
                    [{ field: 'q', operator: 'contains', value: v.trim() || undefined }],
                    'merge',
                  )
                }
              />
              <Select
                allowClear
                placeholder="Status"
                style={{ width: 180 }}
                options={MAINTENANCE_STATUS_OPTIONS}
                value={statusFilter}
                onChange={(v) =>
                  setFilters([{ field: 'status', operator: 'eq', value: v ?? undefined }], 'merge')
                }
              />
            </>
          )}
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setReportOpen(true)}>
          Report Issue
        </Button>
      }
    >
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
              expandable={{
                expandedRowKeys: expanded,
                onExpandedRowsChange: (keys) => setExpanded(keys as number[]),
                expandedRowRender: (r) => (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Notes: {r.notes ?? '—'} · Completed: {formatDate(r.completedAt)} · Reported by:{' '}
                    {r.reportedBy?.fullName ?? '—'}
                  </Typography.Text>
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
                  render: (_, r) => <MaintenanceStatusTag status={r.status} />,
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
                  fixed: 'right',
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
