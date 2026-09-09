import { FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Col, Row, Space, Typography } from 'antd';
import { httpClient } from '../providers/axios';

async function download(type: string, format: 'csv' | 'pdf') {
  const res = await httpClient.get(`/reports/${type}`, {
    params: { format },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-report.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

const REPORTS: { type: string; title: string; desc: string }[] = [
  { type: 'assets', title: 'Asset Report', desc: 'Full inventory with status, location, assignee and cost.' },
  { type: 'employees', title: 'Employee Report', desc: 'Everyone, with their location, department and asset count.' },
  { type: 'locations', title: 'Location Report', desc: 'Per-site asset totals broken down by status.' },
  { type: 'warranty', title: 'Warranty Report', desc: 'Assets sorted by warranty days remaining (most urgent first).' },
  {
    type: 'supplies',
    title: 'Accessories & Consumables',
    desc: 'Stock levels, open checkouts, recent issues, and low-stock flags.',
  },
];

export function ReportsPage() {
  const { message } = AntdApp.useApp();

  const get = async (type: string, format: 'csv' | 'pdf') => {
    try {
      await download(type, format);
    } catch {
      message.error('Report download failed');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Reports
        </Typography.Title>
        <Typography.Text type="secondary">
          Download any report as CSV (spreadsheet) or PDF (print-ready).
        </Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        {REPORTS.map((r) => (
          <Col xs={24} md={12} lg={12} key={r.type}>
            <Card size="small" title={r.title}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Text type="secondary">{r.desc}</Typography.Text>
                <Space>
                  <Button icon={<FileTextOutlined />} onClick={() => get(r.type, 'csv')}>
                    CSV
                  </Button>
                  <Button icon={<FilePdfOutlined />} onClick={() => get(r.type, 'pdf')}>
                    PDF
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}
