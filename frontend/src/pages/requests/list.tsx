import { CheckOutlined, CloseOutlined, EditOutlined, FormOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Form, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { PrimaryWithSub } from '../../components/Cells';
import { CopyButton } from '../../components/CopyButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { RecordNotes } from '../../components/RecordNotes';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { AssetCategory, AssetRequest } from '../../types';

export function RequestsPage() {
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const role = identity?.role ?? '';
  const [rows, setRows] = useState<AssetRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<AssetRequest | null>(null);
  const [editTarget, setEditTarget] = useState<AssetRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [historyById, setHistoryById] = useState<
    Record<number, { id: number; createdAt: string; summary: string; changedBy?: { fullName: string } }[]>
  >({});
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [kindFilter, setKindFilter] = useState<string | undefined>();
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await httpClient.get('/asset-requests', {
        params: {
          _start: (page - 1) * pageSize,
          _end: page * pageSize,
          ...(statusFilter.length ? { status: statusFilter.join(',') } : {}),
          ...(kindFilter ? { kind: kindFilter } : {}),
        },
      });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, kindFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    httpClient
      .get('/asset-categories', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setCategories(data.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const submitRequest = async (values: {
    kind: 'asset' | 'accessory';
    categoryId?: number;
    accessoryName?: string;
    reason: string;
  }) => {
    setSubmitting(true);
    try {
      await httpClient.post('/asset-requests', values);
      toast.success('Request submitted — your manager has been notified');
      setCreateOpen(false);
      form.resetFields();
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not submit the request'));
    } finally {
      setSubmitting(false);
    }
  };

  const closeReview = () => {
    setReviewTarget(null);
    setReviewComment('');
    setRejectionReason('');
  };

  const review = async (
    decision: 'approved' | 'rejected',
    comment?: string,
    rejectionReason?: string,
  ) => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await httpClient.patch(`/asset-requests/${reviewTarget.id}/review`, {
        decision,
        comment,
        rejectionReason,
      });
      toast.success(decision === 'approved' ? 'Request approved' : 'Request rejected');
      closeReview();
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not review the request'));
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = (r: AssetRequest) =>
    ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT', 'MANAGER'].includes(role) ||
    (role === 'EMPLOYEE' && r.requester?.id === identity?.employeeId);

  const canChangeStatus = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT', 'MANAGER'].includes(role);

  const saveEdit = async (values: {
    kind: 'asset' | 'accessory';
    categoryId?: number;
    accessoryName?: string;
    reason: string;
    status?: AssetRequest['status'];
  }) => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await httpClient.patch(`/asset-requests/${editTarget.id}`, values);
      toast.success(`Request #${editTarget.id} updated — change is in the history`);
      setEditTarget(null);
      editForm.resetFields();
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update the request'));
    } finally {
      setSubmitting(false);
    }
  };

  const changeRequestStatus = async (r: AssetRequest, status: AssetRequest['status']) => {
    try {
      await httpClient.patch(`/asset-requests/${r.id}`, { status });
      toast.success(`Request #${r.id}: ${r.status} → ${status}`);
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change request status'));
    }
  };

  const loadHistory = async (id: number) => {
    if (historyById[id]) return;
    try {
      const { data } = await httpClient.get(`/asset-requests/${id}/history`);
      setHistoryById((prev) => ({ ...prev, [id]: data ?? [] }));
    } catch {
      setHistoryById((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const fulfill = async (id: number) => {
    try {
      await httpClient.patch(`/asset-requests/${id}/fulfill`);
      toast.success('Marked fulfilled — assign the asset from the Assets page');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not mark the request fulfilled'));
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'gold',
    approved: 'blue',
    rejected: 'red',
    fulfilled: 'green',
  };

  return (
    <Card
      title="Asset & Accessory Requests"
      extra={
        role === 'EMPLOYEE' ? (
          <Button type="primary" icon={<FormOutlined />} onClick={() => setCreateOpen(true)}>
            New request
          </Button>
        ) : null
      }
    >
      {loading && rows.length === 0 ? (
        <TableSkeleton columns={5} />
      ) : loadError ? (
        <EmptyState
          description="Could not load requests. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void load()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            statusFilter.length || kindFilter
              ? 'No requests match the current filters'
              : 'No requests yet'
          }
          actionLabel={
            statusFilter.length || kindFilter
              ? 'Clear filters'
              : role === 'EMPLOYEE'
                ? 'Submit a request'
                : undefined
          }
          onAction={
            statusFilter.length || kindFilter
              ? () => {
                  setStatusFilter([]);
                  setKindFilter(undefined);
                  setPage(1);
                }
              : role === 'EMPLOYEE'
                ? () => setCreateOpen(true)
                : undefined
          }
        />
      ) : (
        <>
          <DataGrid<AssetRequest>
            tableKey="requests"
            searchInputId="requests-grid-search"
            rowKey="id"
            dataSource={rows}
            loading={loading}
            density={density}
            onDensityChange={setDensity}
            fixFirstColumn
            serverSide
            expandable={{
              onExpand: (expanded, record) => {
                if (expanded) void loadHistory(record.id);
              },
              expandedRowRender: (r) => {
                const rows = historyById[r.id];
                if (!rows) return <Typography.Text type="secondary">Loading history…</Typography.Text>;
                if (rows.length === 0) {
                  return <Typography.Text type="secondary">No change history yet</Typography.Text>;
                }
                return (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                      {rows.map((h) => (
                        <li key={h.id}>
                          {new Date(h.createdAt).toLocaleString()} — {h.summary}
                          {h.changedBy?.fullName ? ` (${h.changedBy.fullName})` : ''}
                        </li>
                      ))}
                    </ul>
                    <RecordNotes
                      entityType="AssetRequest"
                      entityId={r.id}
                      canAdd={['SUPER_ADMIN', 'IT_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)}
                    />
                  </Space>
                );
              },
            }}
            onChange={(_p, tableFilters) => {
              const next = (tableFilters.status as string[] | null) ?? [];
              const kind = (tableFilters.kind as string[] | null)?.[0];
              setStatusFilter(next);
              setKindFilter(kind);
              setPage(1);
            }}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                defaultWidth: 72,
                render: (v: number) => (
                  <Space size={4}>
                    {v}
                    <CopyButton value={String(v)} label="request id" />
                  </Space>
                ),
              },
              {
                title: 'Requester',
                gridKey: 'requester',
                render: (_, r) => (
                  <Space size={4}>
                    <PrimaryWithSub
                      primary={`${r.requester?.firstName ?? ''} ${r.requester?.lastName ?? ''}`}
                      sub={r.requester?.employeeCode}
                    />
                    {r.requester?.employeeCode ? (
                      <CopyButton value={r.requester.employeeCode} label="employee code" />
                    ) : null}
                  </Space>
                ),
              },
              {
                title: 'Type',
                dataIndex: 'kind',
                filters: [
                  { text: 'Asset', value: 'asset' },
                  { text: 'Accessory', value: 'accessory' },
                ],
                filterMultiple: false,
                filteredValue: kindFilter ? [kindFilter] : null,
                render: (_, r) =>
                  r.kind === 'asset'
                    ? (r.category?.name ?? 'Asset')
                    : (r.accessoryName ?? 'Accessory'),
                getExportValue: (r) =>
                  r.kind === 'asset'
                    ? (r.category?.name ?? 'Asset')
                    : (r.accessoryName ?? 'Accessory'),
              },
              { title: 'Reason', dataIndex: 'reason', ellipsis: true, defaultWidth: 280 },
              {
                title: 'Status',
                dataIndex: 'status',
                filters: ['pending', 'approved', 'rejected', 'fulfilled'].map((s) => ({
                  text: s,
                  value: s,
                })),
                filteredValue: statusFilter.length ? statusFilter : null,
                render: (s, r) => (
                  <Space direction="vertical" size={0} onClick={(e) => e.stopPropagation()}>
                    {canChangeStatus ? (
                      <Select<AssetRequest['status']>
                        size="small"
                        value={s}
                        style={{ minWidth: 130 }}
                        onChange={(next) => void changeRequestStatus(r, next)}
                        options={['pending', 'approved', 'rejected', 'fulfilled'].map((v) => ({
                          value: v,
                          label: v,
                        }))}
                      />
                    ) : (
                      <Tag color={statusColor[s]}>{s}</Tag>
                    )}
                    {r.status === 'rejected' && r.rejectionReason ? (
                      <Typography.Text type="danger" style={{ fontSize: 11 }}>
                        {r.rejectionReason}
                      </Typography.Text>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: 'Actions',
                gridKey: 'actions',
                exportable: false,
                render: (_, r) => (
                  <Space size={4}>
                    {canEdit(r) && (
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget(r);
                          editForm.setFieldsValue({
                            kind: r.kind,
                            categoryId: r.categoryId ?? undefined,
                            accessoryName: r.accessoryName ?? undefined,
                            reason: r.reason,
                            status: r.status,
                          });
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {role === 'MANAGER' && r.status === 'pending' && (
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewTarget(r);
                        }}
                      >
                        Review
                      </Button>
                    )}
                    {['SUPER_ADMIN', 'IT_ADMIN'].includes(role) && r.status === 'approved' && (
                      <Button
                        size="small"
                        type="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          void fulfill(r.id);
                        }}
                      >
                        Mark fulfilled
                      </Button>
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
            onChange={(p, s) => {
              setPage(p);
              setPageSize(s);
            }}
          />
        </>
      )}

      <Modal
        open={createOpen}
        title="Request asset or accessory"
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        okText="Submit request"
        confirmLoading={submitting}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={submitRequest}
          initialValues={{ kind: 'asset' }}
        >
          <Form.Item name="kind" label="Request type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Asset (laptop, monitor, …)', value: 'asset' },
                { label: 'Accessory (mouse, headset, …)', value: 'accessory' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.kind !== c.kind}>
            {({ getFieldValue }) =>
              getFieldValue('kind') === 'asset' ? (
                <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                  <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
                </Form.Item>
              ) : (
                <Form.Item name="accessoryName" label="Accessory type" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Wireless mouse, USB-C hub" />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!reviewTarget}
        title={`Review request #${reviewTarget?.id ?? ''}`}
        onCancel={closeReview}
        footer={[
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            disabled={!rejectionReason.trim()}
            loading={submitting}
            onClick={() => void review('rejected', undefined, rejectionReason.trim())}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={() => void review('approved', reviewComment.trim() || undefined)}
          >
            Approve
          </Button>,
        ]}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {reviewTarget?.requester
            ? `${reviewTarget.requester.firstName} ${reviewTarget.requester.lastName} (${reviewTarget.requester.employeeCode}) requests `
            : ''}
          {reviewTarget?.kind === 'asset'
            ? (reviewTarget.category?.name ?? 'an asset')
            : (reviewTarget?.accessoryName ?? 'an accessory')}
        </Typography.Text>
        <Typography.Paragraph style={{ marginTop: 8 }}>{reviewTarget?.reason}</Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="Comment (optional, for approval)">
            <Input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          </Form.Item>
          <Form.Item label="Rejection reason (required to reject)" required>
            <Input.TextArea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why is this request being rejected?"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!editTarget}
        title={`Edit request #${editTarget?.id ?? ''} (${editTarget?.status ?? ''})`}
        onCancel={() => setEditTarget(null)}
        onOk={() => editForm.submit()}
        okText="Save changes"
        confirmLoading={submitting}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Fulfilled and rejected requests stay editable. Every save is written to the change
          history (expand the row to see who changed what).
        </Typography.Paragraph>
        <Form form={editForm} layout="vertical" onFinish={saveEdit}>
          <Form.Item name="kind" label="Request type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Asset', value: 'asset' },
                { label: 'Accessory', value: 'accessory' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.kind !== c.kind}>
            {({ getFieldValue }) =>
              getFieldValue('kind') === 'asset' ? (
                <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                  <Select options={categories.map((c) => ({ label: c.name, value: c.id }))} />
                </Form.Item>
              ) : (
                <Form.Item name="accessoryName" label="Accessory type" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          {canChangeStatus && (
            <Form.Item name="status" label="Status">
              <Select
                options={['pending', 'approved', 'rejected', 'fulfilled'].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
