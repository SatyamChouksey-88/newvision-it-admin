import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { EventTimeline, type TimelineEvent } from '../../../components/EventTimeline';
import { useToast } from '../../../components/Toast';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { PoStatusTag } from '../status';

export function PurchaseOrderShow() {
  const { id } = useParams();
  const toast = useToast();
  const { confirmAction } = useConfirmAction();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [reasonOpen, setReasonOpen] = useState<'cancel' | 'short' | 'amend' | 'void' | null>(null);
  const [reason, setReason] = useState('');
  const [grnId, setGrnId] = useState<number | null>(null);
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvQty, setRecvQty] = useState(1);

  const load = useCallback(() => {
    if (!id) return;
    httpClient.get(`/purchase-orders/${id}`).then(({ data }) => setRow(data));
    httpClient
      .get(`/purchase-orders/${id}/history`)
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
  const lines =
    (row?.lineItems as { id: number; product: string; unitCost: number; quantity: number }[]) ?? [];
  const receipts =
    (row?.receipts as {
      id: number;
      grnNumber: string;
      isReversed: boolean;
      receivedAt: string;
    }[]) ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <span>{String(row?.poNumber ?? 'PO')}</span>
            <PoStatusTag status={status} />
          </Space>
        }
        extra={
          <Space wrap>
            <Tooltip title={status === 'draft' ? '' : 'Only a draft PO is sent to the vendor'}>
              <Button
                disabled={status !== 'draft'}
                onClick={() =>
                  void confirmAction({
                    title: 'Mark this PO as sent to the vendor?',
                    content: 'The PO status will change to sent.',
                    okText: 'Mark sent',
                    onOk: async () => {
                      await httpClient.post(`/purchase-orders/${id}/send`);
                      load();
                    },
                  })
                }
              >
                Mark sent
              </Button>
            </Tooltip>
            <Tooltip
              title={
                ['draft', 'sent', 'partially_received'].includes(status)
                  ? 'Creates a new revision and keeps the previous snapshot'
                  : 'Cannot amend in this state'
              }
            >
              <Button
                disabled={!['draft', 'sent', 'partially_received'].includes(status)}
                onClick={() => setReasonOpen('amend')}
              >
                Amend
              </Button>
            </Tooltip>
            <Tooltip
              title={
                ['sent', 'partially_received'].includes(status) ? '' : 'Receive against a sent PO'
              }
            >
              <Button
                disabled={!['sent', 'partially_received'].includes(status)}
                onClick={() => setRecvOpen(true)}
              >
                Record GRN
              </Button>
            </Tooltip>
            <Tooltip
              title={
                ['sent', 'partially_received'].includes(status)
                  ? ''
                  : 'Short-close is for incomplete receipts'
              }
            >
              <Button
                disabled={!['sent', 'partially_received'].includes(status)}
                onClick={() => setReasonOpen('short')}
              >
                Short-close
              </Button>
            </Tooltip>
            <Tooltip
              title={
                ['received', 'closed', 'cancelled'].includes(status)
                  ? 'Cannot cancel after receipt is complete'
                  : ''
              }
            >
              <Button
                danger
                disabled={['received', 'closed', 'cancelled'].includes(status)}
                onClick={() => setReasonOpen('cancel')}
              >
                Cancel PO
              </Button>
            </Tooltip>
            <Button
              onClick={async () => {
                const res = await httpClient.get(`/purchase-orders/${id}/pdf`, {
                  responseType: 'blob',
                });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${row?.poNumber ?? 'po'}.pdf`;
                a.click();
              }}
            >
              PDF
            </Button>
          </Space>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Vendor">
            {String((row?.vendor as { legalName?: string })?.legalName ?? '—')}
          </Descriptions.Item>
          <Descriptions.Item label="Total">
            ₹{Number(row?.total ?? 0).toLocaleString('en-IN')}
          </Descriptions.Item>
          <Descriptions.Item label="Revision">{String(row?.revision ?? 1)}</Descriptions.Item>
          <Descriptions.Item label="Terms">{String(row?.terms ?? '—')}</Descriptions.Item>
        </Descriptions>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={lines}
          style={{ marginTop: 16 }}
          columns={[
            { title: 'Product', dataIndex: 'product' },
            {
              title: 'Unit cost',
              dataIndex: 'unitCost',
              render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`,
            },
            { title: 'Qty', dataIndex: 'quantity' },
          ]}
        />
      </Card>
      <Card title="Goods receipts">
        {receipts.length === 0 ? (
          <Typography.Text type="secondary">No receipts yet.</Typography.Text>
        ) : null}
        {receipts.map((g) => (
          <div
            key={g.id}
            style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}
          >
            <span>
              {g.grnNumber}
              {g.isReversed ? ' (voided)' : ''}
            </span>
            <Button
              size="small"
              disabled={g.isReversed}
              onClick={() => {
                setGrnId(g.id);
                setReasonOpen('void');
              }}
            >
              Void GRN
            </Button>
          </div>
        ))}
      </Card>
      <Card title="Edit history">
        <EventTimeline events={history} />
      </Card>
      <Modal
        title={
          reasonOpen === 'void'
            ? 'Void GRN'
            : reasonOpen === 'amend'
              ? 'Amend PO'
              : reasonOpen === 'short'
                ? 'Short-close'
                : 'Cancel PO'
        }
        open={!!reasonOpen}
        onCancel={() => setReasonOpen(null)}
        onOk={async () => {
          try {
            if (reasonOpen === 'cancel')
              await httpClient.post(`/purchase-orders/${id}/cancel`, { reason });
            if (reasonOpen === 'short')
              await httpClient.post(`/purchase-orders/${id}/short-close`, { reason });
            if (reasonOpen === 'amend')
              await httpClient.post(`/purchase-orders/${id}/amend`, { reason });
            if (reasonOpen === 'void' && grnId)
              await httpClient.post(`/purchase-orders/receipts/${grnId}/void`, { reason });
            setReasonOpen(null);
            setReason('');
            load();
          } catch (e) {
            toast.error(apiErrorMessage(e, 'Action failed'));
          }
        }}
        okButtonProps={{ disabled: reason.trim().length < 3 }}
      >
        <Form layout="vertical">
          <Form.Item label="Reason" required>
            <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Record receipt"
        open={recvOpen}
        onCancel={() => setRecvOpen(false)}
        onOk={async () => {
          if (!lines[0]) return;
          await httpClient.post(`/purchase-orders/${id}/receipts`, {
            lines: [{ purchaseOrderLineId: lines[0].id, quantityReceived: recvQty }],
          });
          setRecvOpen(false);
          load();
        }}
      >
        <Form layout="vertical">
          <Form.Item label={`Quantity received (${lines[0]?.product ?? 'line 1'})`}>
            <InputNumber min={0} value={recvQty} onChange={(v) => setRecvQty(Number(v ?? 0))} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
