import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EventTimeline, type TimelineEvent } from '../../../components/EventTimeline';
import { useToast } from '../../../components/Toast';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import { httpClient } from '../../../providers/axios';
import { ApprovalChain, type ApproverRow, PrStatusTag } from '../status';

export function RequisitionShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirmAction } = useConfirmAction();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    httpClient.get(`/purchase-requisitions/${id}`).then(({ data }) => setRow(data));
    httpClient
      .get(`/purchase-requisitions/${id}/history`)
      .then(({ data }) =>
        setHistory(
          (data ?? []).map(
            (h: {
              id: number;
              createdAt: string;
              summary: string;
              actor?: { fullName: string };
            }) => ({
              id: h.id,
              at: h.createdAt,
              summary: h.summary,
              actor: h.actor?.fullName,
            }),
          ),
        ),
      )
      .catch(() => setHistory([]));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const status = String(row?.status ?? '');
  const approvers = (row?.approvers as ApproverRow[]) ?? [];
  const canEdit = ['draft', 'pending_approval', 'rejected', 'approved'].includes(status);
  const canSubmit = ['draft', 'rejected'].includes(status);
  const canCancel = ['draft', 'pending_approval', 'approved'].includes(status);
  const canConvert = status === 'approved';
  const canDecide = status === 'pending_approval';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <span>{String(row?.title ?? 'Requisition')}</span>
            <PrStatusTag status={status} />
          </Space>
        }
        extra={
          <Space wrap>
            <Tooltip
              title={
                canEdit
                  ? 'Material edits (total, vendor, quantity, lines) reset approval'
                  : 'This requisition cannot be edited in its current state'
              }
            >
              <Button
                disabled={!canEdit}
                onClick={() => navigate(`/procurement/requisitions/edit/${id}`)}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip
              title={canSubmit ? '' : 'Only draft or rejected requisitions can be submitted'}
            >
              <Button
                disabled={!canSubmit}
                onClick={() =>
                  void confirmAction({
                    title: 'Submit this requisition for approval?',
                    content: 'Approvers will be notified.',
                    okText: 'Submit',
                    onOk: async () => {
                      await httpClient.post(`/purchase-requisitions/${id}/submit`);
                      toast.success('Submitted');
                      load();
                    },
                  })
                }
              >
                Submit
              </Button>
            </Tooltip>
            <Tooltip title={canDecide ? '' : 'Not awaiting your decision'}>
              <Button
                type="primary"
                disabled={!canDecide}
                onClick={() =>
                  void confirmAction({
                    title: 'Approve this requisition?',
                    content: 'This records your approval on the chain.',
                    okText: 'Approve',
                    onOk: async () => {
                      await httpClient.post(`/purchase-requisitions/${id}/decide`, {
                        decision: 'approved',
                      });
                      toast.success('Approved');
                      load();
                    },
                  })
                }
              >
                Approve
              </Button>
            </Tooltip>
            <Button
              danger
              disabled={!canDecide}
              onClick={() => {
                setRejectComment('');
                setRejectOpen(true);
              }}
            >
              Reject
            </Button>
            <Tooltip
              title={
                canConvert ? '' : 'Convert is available after all required approvers have approved'
              }
            >
              <Button
                disabled={!canConvert}
                onClick={() =>
                  void confirmAction({
                    title: 'Create a purchase order from this requisition?',
                    content: 'A new PO will be created from the approved lines.',
                    okText: 'Create PO',
                    onOk: async () => {
                      const { data } = await httpClient.post(
                        `/purchase-orders/from-requisition/${id}`,
                      );
                      toast.success('Purchase order created');
                      navigate(`/procurement/orders/show/${data.id}`);
                    },
                  })
                }
              >
                Convert to PO
              </Button>
            </Tooltip>
            <Tooltip title={canCancel ? '' : 'Cannot cancel in this state'}>
              <Button disabled={!canCancel} onClick={() => setReasonOpen(true)}>
                Withdraw / cancel
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <Typography.Text type="secondary">
          {String(row?.requisitionNumber ?? '')} · revision {String(row?.revision ?? 1)}
        </Typography.Text>
        <div style={{ margin: '12px 0' }}>
          <ApprovalChain approvers={approvers} />
        </div>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Department">
            {String((row?.department as { name?: string })?.name ?? row?.departmentFreeText ?? '—')}
          </Descriptions.Item>
          <Descriptions.Item label="Category">{String(row?.category ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Vendor">
            {String(
              (row?.vendor as { legalName?: string })?.legalName ?? row?.vendorFreeText ?? '—',
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Total">
            ₹{Number(row?.totalCost ?? 0).toLocaleString('en-IN')}
          </Descriptions.Item>
          <Descriptions.Item label="Business requirement" span={2}>
            {String(row?.businessRequirement ?? '—')}
          </Descriptions.Item>
        </Descriptions>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={
            (row?.lineItems as {
              id: number;
              product: string;
              unitCost: number;
              quantity: number;
              commercialNotes?: string;
            }[]) ?? []
          }
          columns={[
            { title: 'Product', dataIndex: 'product' },
            {
              title: 'Unit cost',
              dataIndex: 'unitCost',
              render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`,
            },
            { title: 'Qty', dataIndex: 'quantity' },
            { title: 'Commercial / notes', dataIndex: 'commercialNotes' },
          ]}
          style={{ marginTop: 16 }}
        />
      </Card>
      <Card title="Edit history">
        <EventTimeline events={history} />
      </Card>
      <Modal
        title="Reject requisition"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: rejectComment.trim().length < 3 }}
        onOk={async () => {
          await httpClient.post(`/purchase-requisitions/${id}/decide`, {
            decision: 'rejected',
            comment: rejectComment.trim(),
          });
          setRejectOpen(false);
          load();
        }}
      >
        <Form layout="vertical">
          <Form.Item label="Comment" required>
            <Input.TextArea
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Cancel requisition"
        open={reasonOpen}
        onCancel={() => setReasonOpen(false)}
        onOk={async () => {
          await httpClient.post(`/purchase-requisitions/${id}/cancel`, { reason });
          setReasonOpen(false);
          load();
        }}
        okButtonProps={{ disabled: reason.trim().length < 3 }}
      >
        <Form layout="vertical">
          <Form.Item label="Reason" required>
            <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
