import { useGetIdentity } from '@refinedev/core';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
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
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { EmptyState } from '../../../components/EmptyState';
import { EventTimeline, type TimelineEvent } from '../../../components/EventTimeline';
import { ManualEditButton } from '../../../components/ManualEdit';
import { RecordNotes } from '../../../components/RecordNotes';
import { useToast } from '../../../components/Toast';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import type { Identity } from '../../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { PoStatusTag } from '../status';

export function PurchaseOrderShow() {
  const { id } = useParams();
  const toast = useToast();
  const { confirmAction } = useConfirmAction();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [reasonOpen, setReasonOpen] = useState<'cancel' | 'short' | 'amend' | 'void' | null>(null);
  const [reason, setReason] = useState('');
  const [grnId, setGrnId] = useState<number | null>(null);
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvQty, setRecvQty] = useState(1);
  const [invOpen, setInvOpen] = useState(false);
  const [invForm] = Form.useForm();
  const isSuperAdmin = identity?.role === 'SUPER_ADMIN';

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    httpClient
      .get(`/purchase-orders/${id}`)
      .then(({ data }) => setRow(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
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
  const invoices =
    (row?.invoices as {
      id: number;
      invoiceNumber: string;
      amount: number;
      matchStatus: string;
      paymentStatus: string;
      invoiceDate: string;
    }[]) ?? [];
  const vendorId = (row?.vendor as { id?: number } | undefined)?.id;

  if (loading && !row) return <Card loading />;
  if (loadError && !row) {
    return (
      <EmptyState
        description="This purchase order could not be loaded."
        actionLabel="Retry"
        onAction={() => load()}
      />
    );
  }

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
                ['sent', 'partially_received', 'received', 'closed'].includes(status)
                  ? ''
                  : 'Record an invoice against a sent or received PO'
              }
            >
              <Button
                disabled={!['sent', 'partially_received', 'received', 'closed'].includes(status)}
                onClick={() => {
                  invForm.setFieldsValue({
                    invoiceDate: dayjs(),
                    amount: Number(row?.total ?? 0),
                    taxAmount: 0,
                    correction: false,
                  });
                  setInvOpen(true);
                }}
              >
                Record invoice
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
            {canManage && row ? (
              <ManualEditButton
                entityType="PurchaseOrder"
                id={id ? Number(id) : undefined}
                fields={[
                  { name: 'terms', label: 'Terms', value: row.terms },
                  { name: 'deliveryDate', label: 'Delivery date', value: row.deliveryDate },
                ]}
                onSaved={load}
              />
            ) : null}
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
      <Card title="Invoices">
        {invoices.length === 0 ? (
          <Typography.Text type="secondary">No invoices recorded yet.</Typography.Text>
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={invoices}
            columns={[
              { title: 'Number', dataIndex: 'invoiceNumber' },
              {
                title: 'Amount',
                dataIndex: 'amount',
                render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}`,
              },
              { title: 'Match', dataIndex: 'matchStatus' },
              { title: 'Payment', dataIndex: 'paymentStatus' },
            ]}
          />
        )}
      </Card>
      <Card title="Edit history">
        <EventTimeline events={history} />
      </Card>
      <RecordNotes entityType="PurchaseOrder" entityId={id ? Number(id) : undefined} canAdd={canManage} />
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
      <Modal
        title="Record vendor invoice"
        open={invOpen}
        onCancel={() => setInvOpen(false)}
        onOk={async () => {
          if (!vendorId) {
            toast.error('This PO has no vendor');
            return;
          }
          try {
            const v = await invForm.validateFields();
            const { data } = await httpClient.post('/purchase-orders/invoices', {
              vendorId,
              purchaseOrderId: Number(id),
              invoiceNumber: v.invoiceNumber,
              invoiceDate: dayjs(v.invoiceDate).toISOString(),
              amount: v.amount,
              taxAmount: v.taxAmount ?? 0,
              exceptionNote: v.exceptionNote,
              correction: v.correction === true,
            });
            if (Array.isArray(data.similarInvoices) && data.similarInvoices.length > 0) {
              toast.success(
                `Invoice ${data.invoiceNumber} recorded. Warning: another invoice for this vendor has the same amount within 7 days.`,
              );
            } else {
              toast.success(`Invoice ${data.invoiceNumber} recorded`);
            }
            setInvOpen(false);
            invForm.resetFields();
            load();
          } catch (e) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            if (status === 409 && isSuperAdmin) {
              toast.error(
                `${apiErrorMessage(e, 'That invoice number already exists')}. Tick “Record as correction” to save it as ${String(invForm.getFieldValue('invoiceNumber') ?? 'INV')}-CORR.`,
              );
              invForm.setFieldsValue({ correction: true });
              return;
            }
            toast.error(apiErrorMessage(e, 'Could not record invoice'));
          }
        }}
      >
        <Form form={invForm} layout="vertical">
          <Form.Item
            name="invoiceNumber"
            label="Invoice number"
            rules={[{ required: true, message: 'Vendor invoice number is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="invoiceDate" label="Invoice date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="taxAmount" label="Tax">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="exceptionNote" label="Exception note (required if 3-way match fails)">
            <Input.TextArea rows={2} />
          </Form.Item>
          {isSuperAdmin ? (
            <Form.Item name="correction" valuePropName="checked">
              <Checkbox>Record as correction (-CORR suffix) if this number already exists</Checkbox>
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </Space>
  );
}
