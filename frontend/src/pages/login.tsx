import { App as AntdApp, Button, Checkbox, Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { TOKEN_KEY, USER_KEY, writeSession } from '../providers/session';
import { COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_MONO } from '../theme';

const DEMO_ACCOUNTS = [
  ['Super Admin', 'superadmin@newvision.local'],
  ['IT Admin', 'itadmin@newvision.local'],
  ['IT Support', 'support@newvision.local'],
  ['Manager', 'manager@newvision.local'],
  ['Employee', 'employee@newvision.local'],
];

const SHOW_DEMO = import.meta.env.DEV;

type MfaState =
  | { mode: 'verify'; token: string }
  | { mode: 'enroll'; token: string; secret: string; qr: string };

function redirectAfterLogin() {
  const to = new URLSearchParams(window.location.search).get('to');
  return to?.startsWith('/') && !to.startsWith('//') ? to : '/';
}

function finishSession(data: { access_token?: string; user?: unknown }) {
  if (!data.access_token || !data.user) throw new Error('Login did not return a session');
  writeSession(TOKEN_KEY, data.access_token);
  writeSession(USER_KEY, JSON.stringify(data.user));
  window.location.assign(redirectAfterLogin());
}

export function LoginPage() {
  const { message } = AntdApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotForm] = Form.useForm();
  const [mfa, setMfa] = useState<MfaState | null>(null);
  const [mfaCode, setMfaCode] = useState('');

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

  const signIn = async (values: { email: string; password: string; remember?: boolean }) => {
    setSubmitting(true);
    try {
      const { data } = await httpClient.post('/auth/login', {
        email: values.email,
        password: values.password,
        remember: values.remember !== false,
      });
      const token = data.mfaToken || data.mfa_token;
      if (data.mfaRequired && token) {
        setMfa({ mode: 'verify', token });
        return;
      }
      if ((data.mfaEnrollRequired || data.mfaSetupRequired) && token) {
        setMfa({
          mode: 'enroll',
          token,
          secret: data.secret ?? '',
          qr: data.qrDataUrl,
        });
        return;
      }
      finishSession(data);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      message.error(
        status === 429
          ? 'Too many attempts. Try again in 15 minutes.'
          : status === 401 || status === 400
            ? 'Invalid email or password'
            : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitMfa = async () => {
    if (!mfa) return;
    setSubmitting(true);
    try {
      const { data } = await httpClient.post('/auth/mfa/verify', {
        mfa_token: mfa.token,
        code: mfaCode.replace(/\s/g, ''),
      });
      finishSession(data);
    } catch (e) {
      message.error(apiErrorMessage(e, 'Invalid authenticator code'));
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
          {mfa ? 'Authenticator' : 'Sign in'}
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 28, fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
          {mfa?.mode === 'enroll'
            ? 'Scan this QR code with your authenticator app, then enter the 6-digit code.'
            : mfa?.mode === 'verify'
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'IT asset manager for your company. Sign in with the workspace owner’s email, or start a trial.'}
        </Typography.Paragraph>

        {mfa ? (
          <div style={{ maxWidth: 360 }}>
            {mfa.mode === 'enroll' ? (
              <img src={mfa.qr} alt="Authenticator QR code" width={192} height={192} style={{ marginBottom: 16 }} />
            ) : null}
            <Input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="123456"
              maxLength={8}
              autoComplete="one-time-code"
              autoFocus
              id="mfa-code"
            />
            <Button
              type="primary"
              onClick={() => void submitMfa()}
              loading={submitting}
              block
              style={{ height: 36, marginTop: 12 }}
            >
              Verify
            </Button>
            <Button type="link" onClick={() => { setMfa(null); setMfaCode(''); }} style={{ paddingLeft: 0, marginTop: 8 }}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <Form
            layout="vertical"
            requiredMark={false}
            initialValues={
              SHOW_DEMO
                ? { email: 'itadmin@newvision.local', password: 'Password123!', remember: true }
                : { remember: true }
            }
            onFinish={(values) => void signIn(values)}
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
            <Button type="primary" htmlType="submit" loading={submitting} block style={{ height: 36, marginTop: 8 }}>
              Sign in
            </Button>
          </Form>
        )}

        <Typography.Paragraph style={{ marginTop: 16, fontSize: 13 }}>
          New company? <a href="/signup">Start a 14-day trial</a>
          {' · '}
          <a href="/trust">Trust</a>
        </Typography.Paragraph>

        <Typography.Paragraph style={{ marginTop: 8, fontSize: 12, color: COLOR_TEXT_MUTED, maxWidth: 360 }}>
          Trouble signing in? Use Forgot password, or ask your workspace Super Admin.
        </Typography.Paragraph>

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

        {SHOW_DEMO ? (
          <div className="nv-login-demo">
            <Typography.Text strong style={{ fontSize: 13 }}>
              Local demo accounts
            </Typography.Text>
            <Typography.Text style={{ display: 'block', fontSize: 12, color: COLOR_TEXT_MUTED, marginTop: 4 }}>
              Password: Password123! — never shown in a production build.
            </Typography.Text>
            <ul>
              {DEMO_ACCOUNTS.map(([role, email]) => (
                <li key={email}>
                  <strong>{role}:</strong> {email}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <aside className="nv-login-estate" aria-label="Product">
        <div
          style={{
            fontSize: 11,
            fontFamily: FONT_MONO,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLOR_TEXT_MUTED,
          }}
        >
          First hour
        </div>
        <Typography.Title level={3} style={{ color: '#fff', marginTop: 12 }}>
          Your Excel → who has what → a closed ticket
        </Typography.Title>
        <div style={{ fontSize: 13, color: COLOR_TEXT_MUTED, maxWidth: 420, lineHeight: 1.55 }}>
          Isolated workspace per company. 14-day Team trial. No per-asset metering. Legal DPA/GST stay
          with your accountant and counsel — the app exports the data they need.
        </div>
      </aside>
    </div>
  );
}
