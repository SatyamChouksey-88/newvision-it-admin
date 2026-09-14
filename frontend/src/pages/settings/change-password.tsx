import { Button, Card, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import type { Identity } from '../../providers/authProvider';
import { useToast } from '../../components/Toast';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { COLOR_TEXT_SECONDARY } from '../../theme';

export function ChangePasswordCard() {
  const toast = useToast();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const submit = async (values: { currentPassword: string; newPassword: string }) => {
    setSaving(true);
    try {
      await httpClient.post('/auth/change-password', values);
      toast.success('Password changed. Sign in again on other devices.');
      form.resetFields();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card size="small" title="Change password">
      <Form form={form} layout="vertical" onFinish={submit} style={{ maxWidth: 320 }}>
        <Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="New password"
          rules={[{ required: true, min: 12, message: 'At least 12 characters' }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Change password
        </Button>
      </Form>
    </Card>
  );
}

export function SuperAdminMfaCard() {
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (identity?.role !== 'SUPER_ADMIN') return;
    httpClient
      .get('/auth/mfa')
      .then(({ data }) => setEnabled(Boolean(data.enabled ?? data.totpEnabled)))
      .catch(() => undefined);
  }, [identity?.role]);

  if (identity?.role !== 'SUPER_ADMIN') return null;

  const begin = async () => {
    try {
      const { data } = await httpClient.post('/auth/mfa/setup');
      setSecret(data.otpauthUrl ?? 'enrolled');
      setMfaToken(data.mfa_token);
      setQr(data.qrDataUrl);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not start authenticator setup'));
    }
  };

  const enable = async () => {
    if (!secret || !mfaToken) return;
    setSaving(true);
    try {
      await httpClient.post('/auth/mfa/verify', { mfa_token: mfaToken, code: code.replace(/\s/g, '') });
      toast.success('Authenticator app enabled');
      setEnabled(true);
      setSecret(null);
      setMfaToken(null);
      setQr(null);
      setCode('');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Invalid authenticator code'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card size="small" title="Authenticator app (Super Admin)">
      {enabled && !secret ? (
        <Typography.Paragraph style={{ marginBottom: 0, color: COLOR_TEXT_SECONDARY }}>
          TOTP is on for this account. Sign-in will ask for a 6-digit code.
        </Typography.Paragraph>
      ) : (
        <>
          <Typography.Paragraph style={{ color: COLOR_TEXT_SECONDARY }}>
            Production Super Admin sign-in requires an authenticator app. Scan the QR, then enter a code to turn it on.
          </Typography.Paragraph>
          {qr ? <img src={qr} alt="Authenticator QR code" width={192} height={192} /> : null}
          {secret ? (
            <div style={{ maxWidth: 240, marginTop: 12 }}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={8}
                autoComplete="one-time-code"
              />
              <Button type="primary" onClick={() => void enable()} loading={saving} style={{ marginTop: 8 }}>
                Confirm and enable
              </Button>
            </div>
          ) : (
            <Button onClick={() => void begin()}>Set up authenticator</Button>
          )}
        </>
      )}
    </Card>
  );
}
