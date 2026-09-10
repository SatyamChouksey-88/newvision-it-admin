import { EnvironmentOutlined, LaptopOutlined, TagsOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Typography } from 'antd';
import { Link } from 'react-router';
import { COLOR_TEXT_SECONDARY } from '../theme';

const STEPS = [
  {
    icon: <EnvironmentOutlined />,
    title: 'Add locations',
    body: 'Pune, Hyderabad, Bhopal — or whatever sites you actually operate.',
    to: '/locations/create',
    label: 'Add a location',
  },
  {
    icon: <TagsOutlined />,
    title: 'Add asset categories',
    body: 'Laptop, monitor, desktop… needed before you can create the first asset.',
    to: '/settings?tab=categories',
    label: 'Add a category',
  },
  {
    icon: <TeamOutlined />,
    title: 'Add employees',
    body: 'People you will assign hardware to. Import a CSV later if the roster is large.',
    to: '/employees',
    label: 'Go to employees',
  },
  {
    icon: <LaptopOutlined />,
    title: 'Add assets',
    body: 'Create one record, or import a spreadsheet from Settings → Import jobs.',
    to: '/assets/create',
    label: 'Add an asset',
  },
];

/** Shown only when the estate has zero locations, employees, and assets. */
export function FirstRunWelcome() {
  return (
    <Card data-testid="first-run-welcome" className="nv-first-run">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
            Welcome to NewVision
          </Typography.Title>
          <Typography.Paragraph style={{ margin: '8px 0 0', fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
            This database is empty — no seed data has been loaded. Set up the estate in this order,
            then the dashboard, tables, and reports will fill in as you go.
          </Typography.Paragraph>
        </div>
        <Row gutter={[12, 12]}>
          {STEPS.map((s, i) => (
            <Col xs={24} sm={12} key={s.to}>
              <div className="nv-first-run-step">
                <div className="nv-first-run-num">{i + 1}</div>
                <div>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    <span style={{ marginRight: 6 }}>{s.icon}</span>
                    {s.title}
                  </Typography.Text>
                  <Typography.Paragraph
                    style={{ margin: '4px 0 10px', fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}
                  >
                    {s.body}
                  </Typography.Paragraph>
                  <Link to={s.to}>
                    <Button size="small" type={i === 0 ? 'primary' : 'default'}>
                      {s.label}
                    </Button>
                  </Link>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
}
