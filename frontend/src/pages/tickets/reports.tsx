import { DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Skeleton, Space, Table, Typography } from 'antd';
import { Pie } from '@ant-design/plots';
import { useEffect, useState } from 'react';
import { CHART_PALETTE } from '../../chartColors';
import { EmptyState } from '../../components/EmptyState';
import { httpClient } from '../../providers/axios';

interface Reports {
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number }[];
  byPriority: Record<string, number>;
  avgResolutionHours: number;
  overdueOpen: number;
  closedPerStaff: { name: string; closed: number; avgRating: number | null }[];
  avgSatisfaction: number | null;
  ratingDistribution: { rating: number; count: number }[];
}

function Donut({ data, name }: { data: { label: string; count: number }[]; name: string }) {
  const rows = data.filter((d) => d.count > 0);
  if (rows.length === 0) return <Typography.Text type="secondary">No data</Typography.Text>;
  return (
    <div role="img" aria-label={name}>
    <Pie
      data={rows}
      angleField="count"
      colorField="label"
      innerRadius={0.62}
      height={220}
      legend={{ position: 'bottom' }}
      scale={{ color: { range: [...CHART_PALETTE] } }}
    />
    </div>
  );
}

export function TicketReports() {
  const [data, setData] = useState<Reports | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    httpClient
      .get('/support-tickets/reports')
      .then(({ data: d }) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  const download = async (format: 'csv' | 'pdf') => {
    const res = await httpClient.get('/support-tickets/reports/export', {
      params: { format },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-reports.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Ticket reports
        </Typography.Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => void download('csv')}>
            CSV
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void download('pdf')}>
            PDF
          </Button>
        </Space>
      </Space>
      {failed ? (
        <EmptyState description="Could not load ticket reports." />
      ) : data == null ? (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
      <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" title="Avg. resolution (hours)">
            <Typography.Title level={3}>{data?.avgResolutionHours ?? '—'}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="Overdue open">
            <Typography.Title level={3}>{data?.overdueOpen ?? '—'}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="Avg. satisfaction">
            <Typography.Title level={3}>{data?.avgSatisfaction ?? '—'}</Typography.Title>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" title="By status">
            <Donut
              name="By status"
              data={Object.entries(data?.byStatus ?? {}).map(([label, count]) => ({ label, count }))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="By category">
            <Donut
              name="By category"
              data={(data?.byCategory ?? []).map((r) => ({ label: r.category, count: r.count }))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" title="By priority">
            <Donut
              name="By priority"
              data={Object.entries(data?.byPriority ?? {}).map(([label, count]) => ({ label, count }))}
            />
          </Card>
        </Col>
      </Row>
      <Card size="small" title="Closed per staff member">
        <Table
          rowKey="name"
          pagination={false}
          size="small"
          dataSource={data?.closedPerStaff ?? []}
          columns={[
            { title: 'Staff', dataIndex: 'name' },
            { title: 'Closed', dataIndex: 'closed' },
            { title: 'Avg. rating', dataIndex: 'avgRating', render: (v) => v ?? '—' },
          ]}
        />
      </Card>
      <Card size="small" title="Rating distribution">
        <Table
          rowKey="rating"
          pagination={false}
          size="small"
          dataSource={data?.ratingDistribution ?? []}
          columns={[
            { title: 'Rating', dataIndex: 'rating' },
            { title: 'Count', dataIndex: 'count' },
          ]}
        />
      </Card>
      </>
      )}
    </Space>
  );
}
