import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';
import { COLOR_TEXT_SECONDARY } from '../../theme';

export function WorkspaceSettingsCard() {
  const toast = useToast();
  const { tenant, reload } = useTenant();
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  if (!tenant) return null;

  const save = async (values: { name?: string; mailFromName?: string; mailFromAddress?: string }) => {
    setSaving(true);
    try {
      await httpClient.patch('/tenant/branding', values);
      toast.success('Workspace branding updated');
      await reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save branding'));
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const { data } = await httpClient.get('/tenant/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tenant.slug}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Export failed'));
    }
  };

  const billing = async () => {
    try {
      const { data } = await httpClient.get('/tenant/billing');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tenant.slug}-billing.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Billing snapshot downloaded — raise the GST invoice in Zoho Books.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not export billing data'));
    }
  };

  const close = async (values: { confirmName: string; password: string }) => {
    setClosing(true);
    try {
      await httpClient.delete('/tenant', { data: values });
      toast.success('Workspace deleted');
      window.location.assign('/login');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not close the workspace'));
    } finally {
      setClosing(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {tenant.status === 'trial' && tenant.trialDaysRemaining != null ? (
        <Alert
          type="info"
          showIcon
          message={`Trial: ${tenant.trialDaysRemaining} day(s) left. Team modules stay on until expiry, then this workspace falls back to Starter (no vendors/chat).`}
        />
      ) : null}
      {tenant.status === 'expired' ? (
        <Alert
          type="warning"
          showIcon
          message="Trial ended. You are on Starter. Talk to sales to unlock Team — payment is collected outside this app (Zoho Books)."
        />
      ) : null}
      <Card size="small" title="Workspace branding">
        <Form
          layout="vertical"
          initialValues={{
            name: tenant.name,
            mailFromName: tenant.mailFromName,
            mailFromAddress: tenant.mailFromAddress,
          }}
          onFinish={(v) => void save(v)}
          style={{ maxWidth: 420 }}
        >
          <Form.Item name="name" label="Company name shown to employees">
            <Input />
          </Form.Item>
          <Form.Item name="mailFromName" label="Email from name">
            <Input placeholder={`${tenant.name} IT`} />
          </Form.Item>
          <Form.Item name="mailFromAddress" label="Email from address">
            <Input placeholder="it@company.in" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save branding
          </Button>
        </Form>
      </Card>
      <Card size="small" title="Plan">
        <Typography.Paragraph style={{ color: COLOR_TEXT_SECONDARY }}>
          Plan <strong>{tenant.plan}</strong> · status <strong>{tenant.status}</strong> · IT seats{' '}
          {tenant.itSeats ?? '—'}/{tenant.seatCap}. Assets are not metered.
        </Typography.Paragraph>
        <Button onClick={() => void billing()}>Download billing snapshot (for Zoho Books)</Button>
      </Card>
      <Card size="small" title="Export &amp; leave">
        <Typography.Paragraph style={{ color: COLOR_TEXT_SECONDARY }}>
          DPDP / contract exit: download JSON of employees, assets, tickets, vendors, then delete the
          workspace. This cannot be undone.
        </Typography.Paragraph>
        <Button onClick={() => void exportData()} style={{ marginRight: 8 }}>
          Export all data
        </Button>
        <Form layout="vertical" onFinish={(v) => void close(v)} style={{ maxWidth: 360, marginTop: 16 }}>
          <Form.Item
            name="confirmName"
            label={`Type ${tenant.name} to confirm deletion`}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Your password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button danger htmlType="submit" loading={closing}>
            Delete workspace
          </Button>
        </Form>
      </Card>
    </Space>
  );
}
