import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Descriptions, Form, Input, Modal, Space, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EmptyState } from '../../../components/EmptyState';
import { EventTimeline, type TimelineEvent } from '../../../components/EventTimeline';
import { ManualEditButton } from '../../../components/ManualEdit';
import { RecordNotes } from '../../../components/RecordNotes';
import { useToast } from '../../../components/Toast';
import { useConfirmAction } from '../../../hooks/useConfirmAction';
import type { Identity } from '../../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { VendorStatusTag } from '../status';

export function VendorShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirmAction } = useConfirmAction();
  const { data: identity } = useGetIdentity<Identity>();
  const canManage = ['SUPER_ADMIN', 'IT_ADMIN'].includes(identity?.role ?? '');
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [reasonOpen, setReasonOpen] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    httpClient
      .get(`/vendors/${id}`)
      .then(({ data }) => setRow(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
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

  if (loading && !row) return <Card loading />;
  if (loadError && !row) {
    return (
      <EmptyState
        description="This vendor could not be loaded."
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
                onClick={() =>
                  void confirmAction({
                    title: 'Approve the pending bank details for this vendor?',
                    content: 'The new bank details become the official record.',
                    okText: 'Approve bank details',
                    onOk: async () => {
                      await httpClient.post(`/vendors/${id}/approve-bank`);
                      toast.success('Bank details approved');
                      load();
                    },
                  })
                }
              >
                Approve bank details
              </Button>
            ) : null}
            {canManage && row ? (
              <ManualEditButton
                entityType="Vendor"
                id={id ? Number(id) : undefined}
                fields={[
                  { name: 'legalName', label: 'Legal name', value: row.legalName },
                  { name: 'tradingName', label: 'Trading name', value: row.tradingName },
                  { name: 'gstin', label: 'GSTIN', value: row.gstin },
                  { name: 'pan', label: 'PAN', value: row.pan },
                  { name: 'taxId', label: 'Tax ID (legacy copy)', value: row.taxId },
                  { name: 'registeredAddress', label: 'Registered address', value: row.registeredAddress },
                  { name: 'remitToAddress', label: 'Remit-to address', value: row.remitToAddress },
                  { name: 'paymentTerms', label: 'Payment terms', value: row.paymentTerms },
                  { name: 'currency', label: 'Currency', value: row.currency },
                  { name: 'defaultBudgetHead', label: 'Default budget head', value: row.defaultBudgetHead },
                ]}
                onSaved={load}
              />
            ) : null}
          </Space>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Code">{String(row?.vendorCode ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="GSTIN">
            {String(row?.gstin ?? '—')}{' '}
            {row?.gstin ? (
              <Typography.Link href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noreferrer">
                Search Taxpayer
              </Typography.Link>
            ) : row?.gstUnregistered ? (
              '(unregistered / foreign)'
            ) : null}
          </Descriptions.Item>
          <Descriptions.Item label="PAN">{String(row?.pan ?? '—')}</Descriptions.Item>
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
      <RecordNotes entityType="Vendor" entityId={id ? Number(id) : undefined} canAdd={canManage} />
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
