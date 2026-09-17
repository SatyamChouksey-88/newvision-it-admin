import {
  CheckCircleOutlined,
  InboxOutlined,
  LaptopOutlined,
  QrcodeOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Row, Space, Typography, Upload } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTenant, type TenantSnapshot } from '../hooks/useTenant';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { useToast } from './Toast';
import { COLOR_TEXT_SECONDARY } from '../theme';
import { isItConsole } from '../access';
import { useGetIdentity } from '@refinedev/core';
import type { Identity } from '../providers/authProvider';

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STEPS = [
  {
    key: 'importEmployees' as const,
    icon: <TeamOutlined />,
    title: 'Import employees',
    body: 'Drop your HR roster (.xlsx or .csv). We map columns and preview the first 50 rows.',
    to: '/employees',
    kind: 'employees' as const,
  },
  {
    key: 'importAssets' as const,
    icon: <LaptopOutlined />,
    title: 'Import assets',
    body: 'The same spreadsheet you already keep — make, model, serial, who has it.',
    to: '/assets',
    kind: 'assets' as const,
  },
  {
    key: 'assignedAsset' as const,
    icon: <InboxOutlined />,
    title: 'Assign one asset',
    body: 'Put a laptop on someone. Their My IT page should show it immediately.',
    to: '/assets',
  },
  {
    key: 'scannedQr' as const,
    icon: <QrcodeOutlined />,
    title: 'Print or scan one QR',
    body: 'Open an asset, print the sticker, scan it on a phone, stamp the audit.',
    to: '/assets',
  },
  {
    key: 'resolvedTicket' as const,
    icon: <CustomerServiceOutlined />,
    title: 'Raise and resolve a ticket',
    body: 'An employee reports Outlook; IT Support assigns it to themselves and closes it with a reply.',
    to: '/tickets/create',
  },
];

function ImportDrop({ kind, onDone }: { kind: 'employees' | 'assets'; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      const { data } = await httpClient.post(`/import-jobs?kind=${kind}`, form);
      await httpClient.post(`/import-jobs/${data.id}/preview`, {
        mapping: data.preview?.suggestedMapping ?? data.mapping ?? {},
      });
      await httpClient.post(`/import-jobs/${data.id}/commit`);
      toast.success(`${kind === 'employees' ? 'Employees' : 'Assets'} queued — mapping used the suggested columns.`);
      onDone();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Import failed — open Settings → Import jobs to map columns'));
    } finally {
      setBusy(false);
    }
    return false;
  };
  return (
    <Upload.Dragger
      accept=".csv,.xlsx,.xls"
      showUploadList={false}
      beforeUpload={(file) => {
        void upload(file);
        return false;
      }}
      disabled={busy}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">{busy ? 'Importing…' : `Drop ${kind} spreadsheet`}</p>
    </Upload.Dragger>
  );
}

/** Same rules as backend `onboardingComplete`: null = legacy/demo (done); skip or all five steps. */
function checklistComplete(tenant: TenantSnapshot | null): boolean {
  if (!tenant) return false;
  if (typeof tenant.onboardingComplete === 'boolean') return tenant.onboardingComplete;
  if (tenant.onboarding == null) return true;
  if (tenant.onboarding.skipped) return true;
  return Boolean(
    tenant.onboarding.importEmployees &&
      tenant.onboarding.importAssets &&
      tenant.onboarding.assignedAsset &&
      tenant.onboarding.scannedQr &&
      tenant.onboarding.resolvedTicket,
  );
}

/** Persistent first-hour checklist. Shown until the five actions are done or skipped. */
export function FirstRunWelcome() {
  const { data: identity } = useGetIdentity<Identity>();
  const { tenant, reload } = useTenant();
  const toast = useToast();
  const done = checklistComplete(tenant);
  const steps = tenant?.onboarding ?? {};

  const remaining = useMemo(
    () => STEPS.filter((s) => !steps[s.key] && !steps.skipped).length,
    [steps],
  );

  if (!isItConsole(identity?.role)) return null;
  if (done) return null;

  const loadSample = async () => {
    try {
      await httpClient.post('/tenant/onboarding/sample');
      toast.success('Loaded a 25-laptop sample company (not the internal 1,250-row seed).');
      await reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load sample company'));
    }
  };

  const skip = async () => {
    await httpClient.post('/tenant/onboarding/skip');
    await reload();
  };

  return (
    <Card data-testid="first-run-welcome" className="nv-first-run">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
            First hour
          </Typography.Title>
          <Typography.Paragraph style={{ margin: '8px 0 0', fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
            {remaining} of 5 still open. Import the Excel you already have — then assign, scan, and close a
            ticket. Procurement and chat stay hidden until this is done.{' '}
            <Link to="/help/getting-started">Getting started guide</Link>
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Button type="primary" onClick={() => void loadSample()}>
            Load sample company
          </Button>
          <Button
            onClick={() =>
              void httpClient
                .get('/tenant/templates/employees.csv', { responseType: 'blob' })
                .then((r) => downloadBlob(r.data, 'employees-template.csv'))
            }
          >
            Employee CSV template
          </Button>
          <Button
            onClick={() =>
              void httpClient
                .get('/tenant/templates/assets.csv', { responseType: 'blob' })
                .then((r) => downloadBlob(r.data, 'assets-template.csv'))
            }
          >
            Asset CSV template
          </Button>
          <Button type="link" onClick={() => void skip()}>
            Skip for now
          </Button>
        </Space>
        <Row gutter={[12, 12]}>
          {STEPS.map((s, i) => {
            const complete = Boolean(steps[s.key]);
            return (
              <Col xs={24} md={12} key={s.key}>
                <div className="nv-first-run-step">
                  <div className="nv-first-run-num">{complete ? <CheckCircleOutlined /> : i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      <span style={{ marginRight: 6 }}>{s.icon}</span>
                      {s.title}
                    </Typography.Text>
                    <Typography.Paragraph
                      style={{ margin: '4px 0 10px', fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}
                    >
                      {s.body}
                    </Typography.Paragraph>
                    {s.kind && !complete ? (
                      <ImportDrop kind={s.kind} onDone={() => void reload()} />
                    ) : (
                      <Link to={s.to}>
                        <Button size="small" type={i === 0 ? 'primary' : 'default'} disabled={complete}>
                          {complete ? 'Done' : 'Open'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
        <Checkbox checked={Boolean(steps.skipped)} onChange={() => void skip()}>
          I know this app — hide the checklist
        </Checkbox>
      </Space>
    </Card>
  );
}
