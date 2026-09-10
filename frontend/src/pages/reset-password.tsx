import { App as AntdApp, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { COLOR_TEXT_SECONDARY } from '../theme';

/** Public "set a new password" page reached via the emailed forgot-password / welcome link. */
export function ResetPasswordPage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const uid = Number(params.get('uid'));
  const token = params.get('token') ?? '';
  const valid = Number.isFinite(uid) && uid > 0 && token.length > 0;

  const submit = async (values: { newPassword: string }) => {
    setSubmitting(true);
    try {
      await httpClient.post('/auth/reset-password', { uid, token, newPassword: values.newPassword });
      message.success('Password set. Sign in with your new password.');
      navigate('/login');
    } catch (e) {
      message.error(apiErrorMessage(e, 'That link is invalid or has expired'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nv-login-split">
      <div className="nv-login-form-col">
        <div className="nv-login-brand">
          <img src="/brand/header-logo.png" alt="NewVision" className="nv-brand-img nv-brand-img--login" />
          <div className="nv-login-wordmark">
            NewVision
            <span> Asset Manager</span>
          </div>
        </div>
        <Typography.Title level={2} style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Set your password
        </Typography.Title>
        {!valid ? (
          <Typography.Paragraph style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, maxWidth: 360 }}>
            This link is missing or malformed. Request a new one from the sign-in page.
          </Typography.Paragraph>
        ) : (
          <>
            <Typography.Paragraph style={{ marginBottom: 24, fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
              Choose a new password (at least 6 characters).
            </Typography.Paragraph>
            <Form layout="vertical" onFinish={submit} style={{ maxWidth: 360 }}>
              <Form.Item
                name="newPassword"
                label="New password"
                rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}
              >
                <Input.Password autoComplete="new-password" autoFocus />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting} block style={{ height: 36 }}>
                Set password
              </Button>
            </Form>
          </>
        )}
      </div>
      <aside className="nv-login-estate" aria-label="NewVision" />
    </div>
  );
}
