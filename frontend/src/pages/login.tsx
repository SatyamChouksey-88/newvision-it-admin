import { useLogin } from '@refinedev/core';
import { App as AntdApp, Button, Checkbox, Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_MONO } from '../theme';

const DEMO_ACCOUNTS = [
  ['Super Admin', 'superadmin@newvision.local'],
  ['IT Admin', 'itadmin@newvision.local'],
  ['IT Support', 'support@newvision.local'],
  ['Manager', 'manager@newvision.local'],
  ['Employee', 'employee@newvision.local'],
];

/** Seed-catalog figures shown on the unauthenticated login panel (no public stats API). */
const ESTATE = [
  { value: '1,250', label: 'Assets tracked' },
  { value: '1,180', label: 'Employees' },
  { value: '3', label: 'Locations' },
  { value: '98.2%', label: 'Records reconciled' },
];

export function LoginPage() {
  const { message } = AntdApp.useApp();
  const { mutate: login, isPending } = useLogin();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotForm] = Form.useForm();

  const sendResetLink = async (values: { email: string }) => {
    setForgotSending(true);
    try {
      await httpClient.post('/auth/forgot-password', { email: values.email });
      message.success('If an account exists for that email, a reset link is on its way.');
      setForgotOpen(false);
      forgotForm.resetFields();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not send the reset link'));
    } finally {
      setForgotSending(false);
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
          Sign in
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 28, fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
          Use your NewVision Softcom directory account.
        </Typography.Paragraph>

        <Form
          layout="vertical"
          requiredMark={false}
          initialValues={{
            email: 'itadmin@newvision.local',
            password: 'Password123!',
            remember: true,
          }}
          onFinish={(values) => login(values)}
          style={{ maxWidth: 360 }}
        >
          <Form.Item name="email" label="Work email" rules={[{ required: true, type: 'email' }]}>
            <Input id="email" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password id="password" autoComplete="current-password" />
          </Form.Item>
          <div className="nv-login-row">
            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Keep me signed in</Checkbox>
            </Form.Item>
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontSize: 12 }}
              onClick={() => setForgotOpen(true)}
            >
              Forgot password?
            </Button>
          </div>
          <Button type="primary" htmlType="submit" loading={isPending} block style={{ height: 36, marginTop: 8 }}>
            Sign in
          </Button>
        </Form>

        <Modal
          title="Reset your password"
          open={forgotOpen}
          onCancel={() => setForgotOpen(false)}
          footer={null}
          destroyOnHidden
        >
          <Typography.Paragraph style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
            Enter your work email and we'll send a link to set a new password.
          </Typography.Paragraph>
          <Form form={forgotForm} layout="vertical" onFinish={sendResetLink}>
            <Form.Item name="email" label="Work email" rules={[{ required: true, type: 'email' }]}>
              <Input autoComplete="username" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={forgotSending} block>
              Send reset link
            </Button>
          </Form>
        </Modal>

        <Typography.Paragraph style={{ marginTop: 16, fontSize: 12, color: COLOR_TEXT_MUTED, maxWidth: 360 }}>
          Trouble signing in? Contact IT Helpdesk — ext. 4120.
        </Typography.Paragraph>

        <div className="nv-login-demo">
          <Typography.Text strong style={{ fontSize: 13 }}>
            Demo accounts
          </Typography.Text>
          <Typography.Text style={{ display: 'block', fontSize: 12, color: COLOR_TEXT_MUTED, marginTop: 4 }}>
            Password: Password123!
          </Typography.Text>
          <ul>
            {DEMO_ACCOUNTS.map(([role, email]) => (
              <li key={email}>
                <strong>{role}:</strong> {email}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="nv-login-estate" aria-label="Estate at a glance">
        <div
          style={{
            fontSize: 11,
            fontFamily: FONT_MONO,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLOR_TEXT_MUTED,
          }}
        >
          Estate at a glance
        </div>
        <div className="nv-login-estate-grid">
          {ESTATE.map((s) => (
            <div key={s.label} className="nv-login-stat">
              <div className="nv-login-stat-value">{s.value}</div>
              <div className="nv-login-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, maxWidth: 420, lineHeight: 1.55 }}>
          Every office in the Locations list. All asset movements are logged and auditable.
        </div>
      </aside>
    </div>
  );
}
