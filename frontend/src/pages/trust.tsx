import { Card, Space, Typography } from 'antd';
import { Link } from 'react-router';
import { COLOR_TEXT_SECONDARY } from '../theme';

/** In-app placeholders for trust artifacts. Legal PDFs are supplied outside the repo. */
export function TrustPage() {
  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <Typography.Title level={2}>Trust &amp; residency</Typography.Title>
      <Typography.Paragraph style={{ color: COLOR_TEXT_SECONDARY }}>
        NewVision is an IT asset manager for Indian companies. The documents below are <strong>link
        targets</strong> — the signed DPA, MSA, and subprocessor list are issued by the operating
        company, not generated in this codebase.
      </Typography.Paragraph>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small" title="Security one-pager">
          <Typography.Paragraph>
            Placeholder. Replace this copy with a one-page PDF hosted by ops (VAPT summary, encryption
            at rest, backup RPO). Until then, the live health check at <code>/api/health</code> reports
            database connectivity and the documented hosting region.
          </Typography.Paragraph>
        </Card>
        <Card size="small" title="Data processing addendum (DPA)">
          <Typography.Paragraph>
            Not bundled in the application. Ask sales for the current DPA. In-app data export and
            account deletion live under Settings → Workspace.
          </Typography.Paragraph>
        </Card>
        <Card size="small" title="Subprocessors">
          <Typography.Paragraph>
            Typical processors for this deployment: the cloud host (see health <code>region</code>),
            Resend or SMTP for mail, and the Postgres provider. Maintain the live list outside git.
          </Typography.Paragraph>
        </Card>
        <Card size="small" title="Hosting region">
          <Typography.Paragraph>
            Default demo database is Singapore — demo only. India region (Mumbai/Hyderabad) on request.
            The API advertises this on <code>GET /api/health</code> as <code>residency</code>.
          </Typography.Paragraph>
        </Card>
      </Space>
      <Typography.Paragraph style={{ marginTop: 24 }}>
        <Link to="/login">Back to sign in</Link>
      </Typography.Paragraph>
    </div>
  );
}
