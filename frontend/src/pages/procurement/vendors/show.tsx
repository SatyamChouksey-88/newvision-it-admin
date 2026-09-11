import { Button, Card, Descriptions, Form, Input, Modal, Space, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EventTimeline, type TimelineEvent } from '../../../components/EventTimeline';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { VendorStatusTag } from '../status';

export function VendorShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [reasonOpen, setReasonOpen] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    httpClient.get(`/vendors/${id}`).then(({ data }) => setRow(data));
    httpClient
      .get(`/vendors/${id}/history`)
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
  const canActivate = ['draft', 'pending_approval', 'suspended'].includes(status);
  const canSuspend = status === 'active';

  const changeStatus = async (next: string) => {
    if (!id) return;
    try {
      await httpClient.patch(`/vendors/${id}/status`, { status: next, reason });
      toast.success('Status updated');
      setReasonOpen(null);
      setReason('');
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change status'));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <span>{String(row?.legalName ?? 'Vendor')}</span>
            <VendorStatusTag status={status} />
          </Space>
        }
        extra={
          <Space wrap>
            <Button onClick={() => navigate(`/procurement/vendors/edit/${id}`)}>Edit</Button>
            <Tooltip
              title={canActivate ? '' : 'Already active, blacklisted, or not awaiting approval'}
            >
              <Button disabled={!canActivate} onClick={() => setReasonOpen('active')}>
                Approve / activate
              </Button>
            </Tooltip>
            <Tooltip title={canSuspend ? '' : 'Only an active vendor can be suspended'}>
              <Button disabled={!canSuspend} onClick={() => setReasonOpen('suspended')}>
                Suspend
              </Button>
            </Tooltip>
            <Tooltip title={status === 'blacklisted' ? 'Already blacklisted' : ''}>
              <Button
                danger
                disabled={status === 'blacklisted'}
                onClick={() => setReasonOpen('blacklisted')}
              >
                Blacklist
              </Button>
            </Tooltip>
            {row?.bankChangePending ? (
              <Button
                type="primary"
                onClick={async () => {
                  await httpClient.post(`/vendors/${id}/approve-bank`);
                  toast.success('Bank details approved');
                  load();
                }}
              >
                Approve bank details
              </Button>
            ) : null}
          </Space>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Code">{String(row?.vendorCode ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Tax ID">{String(row?.taxId ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Terms">{String(row?.paymentTerms ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Bank">
            {String(row?.bankAccountMasked ?? row?.bankAccountNumber ?? '—')}
          </Descriptions.Item>
          <Descriptions.Item label="Categories">
            {((row?.categories as string[]) ?? []).join(', ') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Score">
            {row?.ratingSummary != null ? String(row.ratingSummary) : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Edit history">
        <EventTimeline events={history} />
      </Card>
      <Modal
        title="Reason required"
        open={!!reasonOpen}
        onCancel={() => setReasonOpen(null)}
        onOk={() => reasonOpen && void changeStatus(reasonOpen)}
        okButtonProps={{ disabled: reason.trim().length < 3 }}
      >
        <Typography.Paragraph type="secondary">
          Status changes are audited. Give a short reason.
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="Reason" required>
            <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
