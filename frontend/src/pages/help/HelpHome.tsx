import {
  AlertOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BulbOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FormOutlined,
  ImportOutlined,
  LaptopOutlined,
  QrcodeOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Typography } from 'antd';
import { Link } from 'react-router';
import { COLOR_ACCENT, COLOR_BORDER, COLOR_TEXT_SECONDARY } from '../../theme';

const GLANCE = [
  {
    icon: <LaptopOutlined />,
    title: 'Assets',
    desc: 'Create, assign, transfer, retire, print QR labels, and bulk-manage the serialized fleet.',
    to: 'assets-overview',
  },
  {
    icon: <TeamOutlined />,
    title: 'Employees',
    desc: 'Profiles, History timeline, offboarding/reinstating, and creating a login.',
    to: 'employees',
  },
  {
    icon: <EnvironmentOutlined />,
    title: 'Locations & Departments',
    desc: 'Sites and departments, and how they attach to assets, people, and stock.',
    to: 'locations-departments',
  },
  {
    icon: <AppstoreOutlined />,
    title: 'Accessories & Consumables',
    desc: 'Checkout/check-in for peripherals, issue depletable stock, and low-stock alerts.',
    to: 'accessories-consumables',
  },
  {
    icon: <ToolOutlined />,
    title: 'Maintenance',
    desc: 'The repair ticket lifecycle, vendors, and cost tracking for a specific asset.',
    to: 'maintenance',
  },
  {
    icon: <CustomerServiceOutlined />,
    title: 'Support Tickets',
    desc: 'The general IT helpdesk — statuses, comments, watchers, CSAT, chat, and email-in.',
    to: 'tickets-raise',
  },
  {
    icon: <FormOutlined />,
    title: 'Requests',
    desc: 'How an employee asks for a device or accessory, and how a manager then IT fulfills it.',
    to: 'requests',
  },
  {
    icon: <FileTextOutlined />,
    title: 'Procurement',
    desc: 'Vendors, requisitions, purchase orders, GRNs, invoices, and contract renewals.',
    to: 'procurement-overview',
  },
  {
    icon: <FileTextOutlined />,
    title: 'Reports',
    desc: 'CSV/PDF exports for assets, employees, locations, warranty, and supplies.',
    to: 'reports',
  },
  {
    icon: <ImportOutlined />,
    title: 'Import & Reconciliation',
    desc: 'Bulk import with dry-run and rollback, plus HR reconciliation against live records.',
    to: 'import-export',
  },
  {
    icon: <QrcodeOutlined />,
    title: 'QR & Scanning',
    desc: 'Printable asset labels and the public, login-free phone scan page (no PII).',
    to: 'qr-webhooks',
  },
  {
    icon: <AlertOutlined />,
    title: 'Notifications',
    desc: 'The bell icon, ticket email vs digest, and staff-chat alerts.',
    to: 'notifications',
  },
  {
    icon: <AuditOutlined />,
    title: 'Roles & Permissions',
    desc: 'What each of the five roles can see and do, enforced at the API layer.',
    to: 'roles',
  },
  {
    icon: <ThunderboltOutlined />,
    title: 'Keyboard Shortcuts',
    desc: 'Every shortcut, the ⌘K command palette, and the ? Help jump.',
    to: 'keyboard-shortcuts',
  },
  {
    icon: <SettingOutlined />,
    title: 'Settings',
    desc: 'Account, users, categories, departments, helpdesk mailbox, imports, and webhooks.',
    to: 'settings',
  },
  {
    icon: <BulbOutlined />,
    title: 'Tips & Troubleshooting',
    desc: 'Hidden gems, common failures (SMTP, seed wipe, warranty dump), and what is not built.',
    to: 'tips-troubleshooting',
  },
];

/** Landing page — MkDocs-Material-style "At a Glance" card grid, one card per major feature area. */
export function HelpHome() {
  return (
    <div>
      <Typography.Title level={2} className="nv-page-title" style={{ margin: 0, fontSize: 26 }}>
        NewVision documentation
      </Typography.Title>
      <Typography.Paragraph
        style={{
          marginTop: 8,
          marginBottom: 24,
          fontSize: 13.5,
          color: COLOR_TEXT_SECONDARY,
          maxWidth: 680,
        }}
      >
        NewVision is the internal IT inventory and helpdesk for ~1,250 assets across Pune,
        Hyderabad, and Bhopal. This site is the in-app manual — what each screen actually does
        today, who can use it, and the caveats that matter in daily work. Search above, or browse
        the sections on the left.
      </Typography.Paragraph>

      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        At a glance
      </Typography.Title>
      <Row gutter={[12, 12]}>
        {GLANCE.map((g) => (
          <Col xs={24} sm={12} lg={8} key={g.title}>
            <Link to={`/help/${g.to}`} style={{ textDecoration: 'none' }}>
              <Card
                size="small"
                hoverable
                className="nv-card-interactive"
                style={{ height: '100%' }}
              >
                <span style={{ color: COLOR_ACCENT, fontSize: 18 }}>{g.icon}</span>
                <Typography.Text
                  strong
                  style={{ display: 'block', marginTop: 8, color: '#1F1F1F' }}
                >
                  {g.title}
                </Typography.Text>
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, marginBottom: 0, marginTop: 4 }}
                >
                  {g.desc}
                </Typography.Paragraph>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      <Typography.Title level={5} style={{ marginTop: 32, marginBottom: 12 }}>
        How the app is organized
      </Typography.Title>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card size="small" style={{ height: '100%', borderColor: COLOR_BORDER }}>
            <Typography.Text strong>Five roles</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
              Super Admin (users + everything), IT Admin (estate day-to-day), IT Support (repairs +
              tickets), Manager (team requests, tickets, and requisitions), Employee (own devices,
              requests, tickets). The API enforces every permission; the UI only hides what you
              cannot do.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" style={{ height: '100%', borderColor: COLOR_BORDER }}>
            <Typography.Text strong>Four homes</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
              Super Admin / IT Admin land on the estate console. IT Support lands on an operational
              queue. Managers see team work. Employees see <strong>My IT</strong>. The same sidebar
              labels mean different lists depending on your role.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" style={{ height: '100%', borderColor: COLOR_BORDER }}>
            <Typography.Text strong>Two “ticket” systems, on purpose</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
              <strong>Maintenance</strong> is a hardware repair on a known asset.{' '}
              <strong>Support Tickets</strong> is the general helpdesk (VPN, password, software).
              Asking for a new laptop is a <strong>Request</strong>, not a ticket.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" style={{ height: '100%', borderColor: COLOR_BORDER }}>
            <Typography.Text strong>What is not built</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, margin: '8px 0 0' }}>
              No AI triage, no full SLA engine with business hours, no live AD/HR sync, no Slack
              ingestion, no dark mode. Email-in exists in code; it only polls when IMAP is
              configured. Local SMTP falls back to the backend console log.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
