import { App as AntdApp, Button, Checkbox, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { TOKEN_KEY, USER_KEY, writeSession } from '../providers/session';
import { COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY } from '../theme';

export function SignupPage() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values: {
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    loadSample?: boolean;
  }) => {
    setSubmitting(true);
    try {
      const { data } = await httpClient.post('/auth/signup', values);
      if (!data.access_token || !data.user) throw new Error('Signup did not return a session');
      writeSession(TOKEN_KEY, data.access_token);
      writeSession(USER_KEY, JSON.stringify(data.user));
      navigate('/');
    } catch (e) {
      message.error(apiErrorMessage(e, 'Could not create the workspace'));
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
        <Typography.Title level={2} style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 600 }}>
          Start a 14-day trial
        </Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 28, fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
          Your company gets an isolated workspace. Team features (vendors, chat) are on during the trial,
          then drop to Starter unless you subscribe. GST invoices are raised in Zoho Books — not in this app.
        </Typography.Paragraph>
        <Form layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)} style={{ maxWidth: 360 }}>
          <Form.Item name="companyName" label="Company name" rules={[{ required: true, min: 2 }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="fullName" label="Your name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Work email" rules={[{ required: true, type: 'email' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, min: 12, message: 'At least 12 characters' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="loadSample" valuePropName="checked">
            <Checkbox>Load a ~25-laptop sample company so I can click around</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block style={{ height: 36 }}>
            Create workspace
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16, fontSize: 13 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 12, color: COLOR_TEXT_MUTED, maxWidth: 360 }}>
          By creating a workspace you agree that IT asset data for this company stays in this tenant.
          Legal MSA/DPA PDFs are supplied separately — see <Link to="/trust">Trust</Link>.
        </Typography.Paragraph>
      </div>
      <aside className="nv-login-estate">
        <Typography.Title level={4}>Who has what, in the first hour</Typography.Title>
        <Typography.Paragraph style={{ color: COLOR_TEXT_SECONDARY }}>
          Import the Excel you already keep. Assign a laptop. Scan a QR. Close a ticket. That is the product
          — not another ITSM suite.
        </Typography.Paragraph>
      </aside>
    </div>
  );
}
