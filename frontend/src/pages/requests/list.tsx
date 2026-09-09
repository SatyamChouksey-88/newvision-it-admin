import { CheckOutlined, CloseOutlined, FormOutlined } from '@ant-design/icons';
import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { PrimaryWithSub } from '../../components/Cells';
import { EmptyState } from '../../components/EmptyState';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { httpClient } from '../../providers/axios';
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
  const [reviewComment, setReviewComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpClient.get('/asset-requests', {
        params: { _start: (page - 1) * pageSize, _end: page * pageSize },
      });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    httpClient
      .get('/asset-categories', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setCategories(data.data ?? []));
  }, []);

  const submitRequest = async (values: {
    kind: 'asset' | 'accessory';
    categoryId?: number;
    accessoryName?: string;
    reason: string;
  }) => {
    await httpClient.post('/asset-requests', values);
    toast.success('Request submitted');
    setCreateOpen(false);
    form.resetFields();
    void load();
  };

  const review = async (decision: 'approved' | 'rejected', comment?: string, rejectionReason?: string) => {
    if (!reviewTarget) return;
    await httpClient.patch(`/asset-requests/${reviewTarget.id}/review`, {
      decision,
      comment,
      rejectionReason,
    });
    toast.success(decision === 'approved' ? 'Request approved' : 'Request rejected');
    setReviewTarget(null);
    void load();
  };

  const fulfill = async (id: number) => {
    await httpClient.patch(`/asset-requests/${id}/fulfill`);
    toast.success('Marked fulfilled — assign the asset manually');
    void load();
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
      {loading ? (
        <TableSkeleton columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          description="No requests yet"
          actionLabel={role === 'EMPLOYEE' ? 'Submit a request' : undefined}
          onAction={role === 'EMPLOYEE' ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <>
          <Table<AssetRequest>
            rowKey="id"
            size="small"
            dataSource={rows}
            pagination={false}
            columns={[
              {
                title: 'Requester',
                render: (_, r) => (
                  <PrimaryWithSub
                    primary={`${r.requester?.firstName ?? ''} ${r.requester?.lastName ?? ''}`}
                    sub={r.requester?.employeeCode}
                  />
                ),
              },
              {
                title: 'Type',
                render: (_, r) =>
                  r.kind === 'asset' ? r.category?.name ?? 'Asset' : r.accessoryName ?? 'Accessory',
              },
              { title: 'Reason', dataIndex: 'reason', ellipsis: true },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s, r) => (
                  <Space direction="vertical" size={0}>
                    <Tag color={statusColor[s]}>{s}</Tag>
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
                render: (_, r) => (
                  <Space size={4}>
                    {role === 'MANAGER' && r.status === 'pending' && (
                      <Button
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => setReviewTarget(r)}
                      >
                        Review
                      </Button>
                    )}
                    {['SUPER_ADMIN', 'IT_ADMIN'].includes(role) && r.status === 'approved' && (
                      <Button size="small" type="primary" onClick={() => void fulfill(r.id)}>
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
      >
        <Form form={form} layout="vertical" onFinish={submitRequest} initialValues={{ kind: 'asset' }}>
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
        title="Review request"
        onCancel={() => {
          setReviewTarget(null);
          setReviewComment('');
          setRejectionReason('');
        }}
        footer={[
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            disabled={!rejectionReason.trim()}
            onClick={() => {
              void review('rejected', undefined, rejectionReason);
              setReviewTarget(null);
              setRejectionReason('');
              setReviewComment('');
            }}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              void review('approved', reviewComment || undefined);
              setReviewTarget(null);
              setRejectionReason('');
              setReviewComment('');
            }}
          >
            Approve
          </Button>,
        ]}
      >
        <Typography.Paragraph>{reviewTarget?.reason}</Typography.Paragraph>
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
    </Card>
  );
}
