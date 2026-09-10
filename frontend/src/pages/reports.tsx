import { FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Col, Row, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_MONO } from '../theme';
import type { Location } from '../types';

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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Number(res.headers['x-row-count'] ?? Number.NaN);
}

function buildReports(locationCodes: string[]): { type: string; title: string; desc: string; meta: string }[] {
  return [
    {
      type: 'assets',
      title: 'Asset Report',
      desc: 'Full inventory with status, location, assignee and cost.',
      meta: 'CSV · PDF · estate-wide',
    },
    {
      type: 'employees',
      title: 'Employee Report',
      desc: 'Everyone, with their location, department and asset count.',
      meta: 'CSV · PDF · includes inactive',
    },
    {
      type: 'locations',
      title: 'Location Report',
      desc: 'Per-site asset totals broken down by status.',
      meta: locationCodes.length ? `CSV · PDF · ${locationCodes.join(' · ')}` : 'CSV · PDF · per site',
    },
    {
      type: 'warranty',
      title: 'Warranty Report',
      desc: 'Assets sorted by warranty days remaining (most urgent first).',
      meta: 'CSV · PDF · ≤90 days first',
    },
    {
      type: 'supplies',
      title: 'Accessories & Consumables',
      desc: 'Stock levels, open checkouts, recent issues, and low-stock flags.',
      meta: 'CSV · PDF · live stock',
    },
  ];
}

export function ReportsPage() {
  const { message } = AntdApp.useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [locationCodes, setLocationCodes] = useState<string[]>([]);

  useEffect(() => {
    httpClient
      .get('/locations', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setLocationCodes((data.data ?? []).map((l: Location) => l.code)))
      .catch(() => setLocationCodes([]));
  }, []);

  const REPORTS = buildReports(locationCodes);

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
        <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
          Reports
        </Typography.Title>
        <Typography.Text style={{ fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}>
          Download any report as CSV (spreadsheet) or PDF (print-ready).
        </Typography.Text>
      </div>
      <div className="nv-filters-banner">
        No filters applied — exports include the full estate.
        <Button type="link" size="small" disabled style={{ paddingInline: 8 }}>
          Reset
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        {REPORTS.map((r) => (
          <Col xs={24} md={12} lg={8} key={r.type}>
            <Card size="small" className="nv-card-interactive" hoverable>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {r.title}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}>
                  {r.desc}
                </Typography.Text>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLOR_TEXT_MUTED }}>
                  {r.meta}
                </div>
                <Space>
                  <Button
                    icon={<FileTextOutlined />}
                    loading={busy === `${r.type}:csv`}
                    disabled={!!busy && busy !== `${r.type}:csv`}
                    onClick={() => get(r.type, 'csv')}
                  >
                    Export CSV
                  </Button>
                  <Button
                    icon={<FilePdfOutlined />}
                    loading={busy === `${r.type}:pdf`}
                    disabled={!!busy && busy !== `${r.type}:pdf`}
                    onClick={() => get(r.type, 'pdf')}
                  >
                    Export PDF
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
