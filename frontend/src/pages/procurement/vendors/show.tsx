import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Descriptions, Form, Input, Modal, Select, Space, Switch, Tooltip, Typography, Upload } from 'antd';
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

const DOC_KIND_OPTIONS = [
  { value: 'cancelled_cheque', label: 'Cancelled cheque / bank letter' },
  { value: 'pan', label: 'PAN' },
  { value: 'gst_certificate', label: 'GST certificate' },
  { value: 'msme', label: 'Udyam / MSME' },
  { value: 'other', label: 'Other' },
];

type ComplianceDoc = {
  id: number;
  title: string;
  docKind?: string;
  filename?: string | null;
  expiresAt?: string | null;
};

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
  const [kycOverride, setKycOverride] = useState(false);
  const [docKind, setDocKind] = useState('cancelled_cheque');
  const [docTitle, setDocTitle] = useState('');
  const [docBusy, setDocBusy] = useState(false);

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
      await httpClient.patch(`/vendors/${id}/status`, {
        status: next,
        reason,
        override: next === 'active' ? kycOverride : undefined,
      });
      toast.success('Status updated');
      setReasonOpen(null);
      setReason('');
      setKycOverride(false);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change status'));
    }
  };

  const uploadCompliance = async (file: File) => {
    if (!id) return;
    setDocBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', docTitle.trim() || file.name);
      fd.append('docKind', docKind);
      await httpClient.post(`/vendors/${id}/compliance`, fd);
      toast.success('Document saved');
      setDocTitle('');
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not upload document'));
    } finally {
      setDocBusy(false);
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
              title={
                canActivate
                  ? 'A second Super Admin or IT Admin must confirm the first activation (the creator cannot). Super Admin may self-confirm only if they are the only admin.'
                  : 'Already active, blacklisted, or not awaiting approval'
              }
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
                    content:
                      'The new bank details become the official record. A second admin must confirm — the person who submitted the change cannot. Super Admin may self-confirm only if they are the only admin.',
                    okText: 'Approve bank details',
                    onOk: async () => {
                      try {
                        await httpClient.post(`/vendors/${id}/approve-bank`);
                        toast.success('Bank details approved');
                        load();
                      } catch (e) {
                        toast.error(apiErrorMessage(e, 'Could not approve bank details'));
                        throw e;
                      }
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
          <Descriptions.Item label="Account holder">
            {String(row?.accountHolderName ?? '—')}
            {row?.accountHolderOverrideReason
              ? ` (override: ${String(row.accountHolderOverrideReason)})`
              : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Categories">
            {((row?.categories as string[]) ?? []).join(', ') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Score">
            {row?.ratingSummary != null ? String(row.ratingSummary) : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="KYC documents">
        <Typography.Paragraph type="secondary">
          Indian vendors need a PAN on the record and a cancelled cheque (or bank letter) before
          activation. Super Admin can override.
        </Typography.Paragraph>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {((row?.complianceDocs as ComplianceDoc[]) ?? []).length === 0 ? (
            <Typography.Text type="secondary">No documents yet.</Typography.Text>
          ) : (
            ((row?.complianceDocs as ComplianceDoc[]) ?? []).map((d) => (
              <Typography.Text key={d.id}>
                {DOC_KIND_OPTIONS.find((o) => o.value === d.docKind)?.label ?? d.docKind ?? 'Other'}{' '}
                · {d.title}
                {d.filename ? ` (${d.filename})` : ''}
              </Typography.Text>
            ))
          )}
          {canManage ? (
            <Space wrap align="start">
              <Select
                value={docKind}
                onChange={setDocKind}
                options={DOC_KIND_OPTIONS}
                style={{ minWidth: 240 }}
              />
              <Input
                placeholder="Title (optional)"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                style={{ minWidth: 200 }}
              />
              <Upload
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  void uploadCompliance(file);
                  return false;
                }}
              >
                <Button loading={docBusy}>Upload</Button>
              </Upload>
            </Space>
          ) : null}
        </Space>
      </Card>
      <Card title="Edit history">
        <EventTimeline events={history} />
      </Card>
      <RecordNotes entityType="Vendor" entityId={id ? Number(id) : undefined} canAdd={canManage} />
      <Modal
        title="Reason required"
        open={!!reasonOpen}
        onCancel={() => {
          setReasonOpen(null);
          setKycOverride(false);
        }}
        onOk={() => reasonOpen && void changeStatus(reasonOpen)}
        okButtonProps={{ disabled: reason.trim().length < 3 }}
      >
        <Typography.Paragraph type="secondary">
          Status changes are audited. Give a short reason. Indian vendors also need PAN + cancelled
          cheque unless Super Admin overrides.
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="Reason" required>
            <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Form.Item>
          {reasonOpen === 'active' && identity?.role === 'SUPER_ADMIN' ? (
            <Form.Item label="Skip PAN / cancelled-cheque check">
              <Switch checked={kycOverride} onChange={setKycOverride} />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </Space>
  );
}
