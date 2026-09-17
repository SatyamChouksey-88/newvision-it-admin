import { App as AntdApp, Button, Checkbox, Divider, Form, Input, Modal, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { ENTRA_MFA_HANDOFF_KEY, entraErrorMessage, entraLoginUrl } from '../providers/entra';
import { finishSession } from '../providers/session';
import { COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_MONO } from '../theme';

const DEMO_ACCOUNTS = [
  ['Super Admin', 'superadmin@newvision.local'],
  ['IT Admin', 'itadmin@newvision.local'],
  ['IT Support', 'support@newvision.local'],
  ['Manager', 'manager@newvision.local'],
  ['Employee', 'employee@newvision.local'],
];

/** Phase 1 hardening: opt-in only — demo hints stay off unless the build sets VITE_SHOW_DEMO=true. */
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === 'true';
const DEMO_PASSWORD = 'Password123!';

/** The standard four-color Microsoft logo squares, per Microsoft's sign-in button guidelines. */
function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

type MfaState =
  | { mode: 'verify'; token: string }
  | { mode: 'enroll'; token: string; secret: string; qr: string };

function mfaStateFrom(data: {
  mfaRequired?: boolean;
  mfaRequired2?: never;
  mfaEnrollRequired?: boolean;
  mfaSetupRequired?: boolean;
  mfaToken?: string;
  mfa_token?: string;
  secret?: string;
  qrDataUrl?: string;
}): MfaState | null {
  const token = data.mfaToken || data.mfa_token;
  if (!token) return null;
  if (data.mfaRequired) return { mode: 'verify', token };
  if (data.mfaEnrollRequired || data.mfaSetupRequired) {
    return { mode: 'enroll', token, secret: data.secret ?? '', qr: data.qrDataUrl ?? '' };
  }
  return null;
}

export function LoginPage() {
  const { message } = AntdApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [mfa, setMfa] = useState<MfaState | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [entraError, setEntraError] = useState<string | null>(null);

  // Picks up an MFA challenge handed off from the Entra sign-in flow (entra.ts /
  // EntraCompletePage), so it renders through this same code/QR form rather than duplicating
  // it. Single read — the handoff is consumed immediately.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const entraErrorParam = params.get('entraError');
    if (entraErrorParam) setEntraError(entraErrorParam);
    if (params.get('entraMfa') !== '1') return;
    const raw = sessionStorage.getItem(ENTRA_MFA_HANDOFF_KEY);
    sessionStorage.removeItem(ENTRA_MFA_HANDOFF_KEY);
    if (!raw) return;
    try {
      const state = mfaStateFrom(JSON.parse(raw));
      if (state) setMfa(state);
    } catch {
      // Malformed/expired handoff payload — fall through to the normal sign-in form.
    }
  }, []);

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
      const state = mfaStateFrom(data);
      if (state) {
        setMfa(state);
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
            form={loginForm}
            layout="vertical"
            requiredMark={false}
            initialValues={
              SHOW_DEMO
                ? { email: 'itadmin@newvision.local', password: DEMO_PASSWORD, remember: true }
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
            <Divider style={{ margin: '16px 0' }} plain>
              <Typography.Text style={{ fontSize: 12, color: COLOR_TEXT_MUTED }}>or</Typography.Text>
            </Divider>
            <Button
              block
              style={{ height: 36 }}
              icon={<MicrosoftIcon />}
              onClick={() => {
                window.location.assign(entraLoginUrl());
              }}
            >
              Sign in with Microsoft
            </Button>
          </Form>
        )}

        {entraError ? (
          <Typography.Paragraph style={{ marginTop: 12, fontSize: 12, color: '#cf1322', maxWidth: 360 }}>
            {entraErrorMessage(entraError)}
          </Typography.Paragraph>
        ) : null}

        <Typography.Paragraph style={{ marginTop: 16, fontSize: 12, color: COLOR_TEXT_MUTED, maxWidth: 360 }}>
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
              Password for all: {DEMO_PASSWORD} — click a role to fill the form.
            </Typography.Text>
            <ul>
              {DEMO_ACCOUNTS.map(([role, email]) => (
                <li key={email}>
                  <strong>{role}:</strong>{' '}
                  <Button
                    type="link"
                    style={{ padding: 0, height: 'auto', fontSize: 12 }}
                    onClick={() =>
                      loginForm.setFieldsValue({ email, password: DEMO_PASSWORD, remember: true })
                    }
                  >
                    {email}
                  </Button>
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
        <Typography.Title level={3} style={{ marginTop: 12, color: '#0f172a' }}>
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
