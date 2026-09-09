import { FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Col, Row, Space, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';

/** Pull the server-suggested filename from Content-Disposition (exposed via CORS), else fall back. */
function filenameFrom(disposition: string | undefined, fallback: string) {
  const m = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]) : fallback;
}

async function download(type: string, format: 'csv' | 'pdf') {
  const res = await httpClient.get(`/reports/${type}`, {
    params: { format },
    responseType: 'blob',
  });
  const blob: Blob = res.data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenameFrom(res.headers['content-disposition'], `${type}-report.${format}`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — revoking synchronously cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Number(res.headers['x-row-count'] ?? Number.NaN);
}

const REPORTS: { type: string; title: string; desc: string }[] = [
  {
    type: 'assets',
    title: 'Asset Report',
    desc: 'Full inventory with status, location, assignee and cost.',
  },
  {
    type: 'employees',
    title: 'Employee Report',
    desc: 'Everyone, with their location, department and asset count.',
  },
  {
    type: 'locations',
    title: 'Location Report',
    desc: 'Per-site asset totals broken down by status.',
  },
  {
    type: 'warranty',
    title: 'Warranty Report',
    desc: 'Assets sorted by warranty days remaining (most urgent first).',
  },
  {
    type: 'supplies',
    title: 'Accessories & Consumables',
    desc: 'Stock levels, open checkouts, recent issues, and low-stock flags.',
  },
];

export function ReportsPage() {
  const { message } = AntdApp.useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const get = async (type: string, format: 'csv' | 'pdf') => {
    const key = `${type}:${format}`;
    setBusy(key);
    try {
      const rows = await download(type, format);
      message.success(
        Number.isFinite(rows)
          ? `${format.toUpperCase()} ready — ${rows} rows`
          : `${format.toUpperCase()} ready`,
      );
    } catch (e) {
      message.error(apiErrorMessage(e, 'Report download failed'));
    } finally {
      setBusy(null);
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
                  <Button
                    icon={<FileTextOutlined />}
                    loading={busy === `${r.type}:csv`}
                    disabled={!!busy && busy !== `${r.type}:csv`}
                    onClick={() => get(r.type, 'csv')}
                  >
                    CSV
                  </Button>
                  <Button
                    icon={<FilePdfOutlined />}
                    loading={busy === `${r.type}:pdf`}
                    disabled={!!busy && busy !== `${r.type}:pdf`}
                    onClick={() => get(r.type, 'pdf')}
                  >
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
