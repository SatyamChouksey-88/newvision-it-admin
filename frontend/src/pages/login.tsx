import { AuthPage } from '@refinedev/antd';
import { Typography } from 'antd';
import { COLOR_BORDER, COLOR_CANVAS, COLOR_SURFACE_MUTED, COLOR_TEXT_MUTED } from '../theme';

const DEMO_ACCOUNTS = [
  ['Super Admin', 'superadmin@newvision.local'],
  ['IT Admin', 'itadmin@newvision.local'],
  ['IT Support', 'support@newvision.local'],
  ['Manager', 'manager@newvision.local'],
  ['Employee', 'employee@newvision.local'],
];

export function LoginPage() {
  return (
    <div className="nv-login-wrap" style={{ minHeight: '100vh', background: COLOR_CANVAS }}>
      <AuthPage
        type="login"
        registerLink={false}
        forgotPasswordLink={false}
        rememberMe={false}
        formProps={{
          initialValues: { email: 'itadmin@newvision.local', password: 'Password123!' },
        }}
        title={
          <div style={{ textAlign: 'center' }}>
            <img src="/brand/header-logo.png" alt="NewVision" style={{ height: 48, objectFit: 'contain' }} />
            <Typography.Paragraph style={{ margin: '10px 0 0', fontSize: 13, color: COLOR_TEXT_MUTED }}>
              IT Asset Management
            </Typography.Paragraph>
          </div>
        }
        renderContent={(content) => (
          <div>
            {content}
            <div
              style={{
                maxWidth: 400,
                margin: '16px auto 0',
                padding: 16,
                border: `1px solid ${COLOR_BORDER}`,
                borderRadius: 10,
                background: COLOR_SURFACE_MUTED,
              }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>
                Demo accounts
              </Typography.Text>
              <Typography.Text style={{ display: 'block', fontSize: 12, color: COLOR_TEXT_MUTED, marginTop: 4 }}>
                Password: Password123!
              </Typography.Text>
              <ul style={{ margin: '10px 0 0', paddingInlineStart: 18, fontSize: 12, color: COLOR_TEXT_MUTED }}>
                {DEMO_ACCOUNTS.map(([role, email]) => (
                  <li key={email} style={{ marginBottom: 4 }}>
                    <strong style={{ color: '#475569' }}>{role}:</strong> {email}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      />
    </div>
  );
}
