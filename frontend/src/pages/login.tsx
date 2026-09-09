import { AuthPage } from '@refinedev/antd';
import { Typography } from 'antd';

const DEMO_ACCOUNTS = [
  ['Super Admin', 'superadmin@newvision.local'],
  ['IT Admin', 'itadmin@newvision.local'],
  ['IT Support', 'support@newvision.local'],
  ['Manager', 'manager@newvision.local'],
  ['Employee', 'employee@newvision.local'],
];

export function LoginPage() {
  return (
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
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>
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
              margin: '12px auto 0',
              padding: 12,
              border: '1px solid #f0f0f0',
              borderRadius: 4,
              background: '#fafafa',
            }}
          >
            <Typography.Text strong style={{ fontSize: 12 }}>
              Demo accounts (password: Password123!)
            </Typography.Text>
            <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 12 }}>
              {DEMO_ACCOUNTS.map(([role, email]) => (
                <li key={email}>
                  <b>{role}:</b> {email}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    />
  );
}
