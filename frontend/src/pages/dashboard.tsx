import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  InboxOutlined,
  LineChartOutlined,
  MinusCircleOutlined,
  PieChartOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useCustom } from '@refinedev/core';
import { Card, Col, List, Row, Select, Space, Statistic, Table, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { WarrantyDays } from '../components/Cells';
import { AssetTrendChart } from '../components/charts/AssetTrendChart';
import { LocationBarChart } from '../components/charts/LocationBarChart';
import { StatusDonutChart } from '../components/charts/StatusDonutChart';
import { httpClient } from '../providers/axios';
import { tabularNums } from '../theme';
import type {
  DashboardAttention,
  DashboardMetrics,
  DashboardTrendPoint,
  Location,
  LocationBreakdown,
} from '../types';

interface WarrantyRow {
  id: number;
  assetCode: string;
  brand?: string;
  model?: string;
  location?: string;
  warrantyEnd?: string;
  daysRemaining: number | null;
}

function MetricCard({
  title,
  value,
  icon,
  color,
  accent,
  sparkline,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  accent?: string;
  sparkline?: React.ReactNode;
}) {
  return (
    <Card size="small" style={accent ? { borderTop: `3px solid ${accent}` } : undefined} styles={{ body: { padding: 16 } }}>
      <Statistic
        title={
          <Space size={6} style={{ color: '#595959' }}>
            {icon}
            {title}
          </Space>
        }
        value={value}
        valueStyle={{ ...tabularNums, color, fontWeight: 600 }}
      />
      {sparkline}
    </Card>
  );
}

export function DashboardPage() {
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    httpClient.get('/locations', { params: { _start: 0, _end: 100 } }).then(({ data }) => {
      setLocations(data.data ?? []);
    });
  }, []);

  const { query: metricsQuery } = useCustom<DashboardMetrics>({
    url: 'dashboard/metrics',
    method: 'get',
    config: { query: locationId ? { locationId } : {} },
    queryOptions: { queryKey: ['dashboard-metrics', locationId] },
  });
  const m = metricsQuery.data?.data;
  const isFetching = metricsQuery.isFetching;

  const { query: warrantyQuery } = useCustom<WarrantyRow[]>({
    url: 'dashboard/warranty-expiring',
    method: 'get',
    config: { query: { withinDays: 90, ...(locationId ? { locationId } : {}) } },
    queryOptions: { queryKey: ['dashboard-warranty', locationId] },
  });
  const warrantyRows = warrantyQuery.data?.data ?? [];

  const { query: attentionQuery } = useCustom<DashboardAttention>({
    url: 'dashboard/attention',
    method: 'get',
    config: { query: locationId ? { locationId } : {} },
    queryOptions: { queryKey: ['dashboard-attention', locationId] },
  });
  const attention = attentionQuery.data?.data;
  const attentionItems = [
    ...(attention?.warrantyUrgent ?? []),
    ...(attention?.staleRepairs ?? []),
    ...(attention?.lowStock ?? []),
    ...(attention?.toFulfill ?? []),
  ];

  const { query: trendsQuery } = useCustom<DashboardTrendPoint[]>({
    url: 'dashboard/trends',
    method: 'get',
    config: { query: { months: 12, ...(locationId ? { locationId } : {}) } },
    queryOptions: { queryKey: ['dashboard-trends', locationId] },
  });
  const trends = trendsQuery.data?.data ?? [];

  const { query: byLocationQuery } = useCustom<LocationBreakdown[]>({
    url: 'dashboard/by-location',
    method: 'get',
    queryOptions: { queryKey: ['dashboard-by-location'], enabled: !locationId },
  });
  const byLocation = byLocationQuery.data?.data ?? [];

  const sparklineTrend = useMemo(() => trends.slice(-6), [trends]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row justify="space-between" align="middle">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Dashboard
        </Typography.Title>
        <Select
          allowClear
          aria-label="Filter dashboard by location"
          placeholder="All locations"
          style={{ width: 220 }}
          value={locationId}
          onChange={(v) => setLocationId(v)}
          options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
        />
      </Row>

      {attentionItems.length > 0 && (
        <Card
          size="small"
          style={{ borderLeft: '4px solid #cf1322', background: '#fff1f0' }}
          title={
            <Space>
              <AlertOutlined style={{ color: '#cf1322' }} />
              <Typography.Text strong>Needs attention</Typography.Text>
              {attention?.pendingRequestCount ? (
                <Typography.Text style={{ fontSize: 12, color: '#595959' }}>
                  · {attention.pendingRequestCount} pending request(s)
                </Typography.Text>
              ) : null}
            </Space>
          }
        >
          <List
            size="small"
            dataSource={attentionItems.slice(0, 8)}
            renderItem={(item) => (
              <List.Item>
                <Link to={item.href}>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {item.label}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12, marginLeft: 8, color: '#595959' }}>
                    {item.detail}
                  </Typography.Text>
                </Link>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <MetricCard
            title="Total"
            value={m?.total ?? 0}
            icon={<DatabaseOutlined />}
            accent="#2f54eb"
            sparkline={
              sparklineTrend.length > 0 ? (
                <div style={{ marginTop: 8, height: 48 }}>
                  <AssetTrendChart data={sparklineTrend} height={48} compact />
                </div>
              ) : null
            }
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <MetricCard
            title="Assigned"
            value={m?.assigned ?? 0}
            icon={<CheckCircleOutlined />}
            color="#389e0d"
            accent="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <MetricCard title="Available" value={m?.available ?? 0} icon={<MinusCircleOutlined />} accent="#8c8c8c" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <MetricCard
            title="Under Repair"
            value={m?.underRepair ?? 0}
            icon={<ToolOutlined />}
            color="#d46b08"
            accent="#d46b08"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <MetricCard title="Retired" value={m?.retired ?? 0} icon={<InboxOutlined />} accent="#595959" />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <MetricCard
            title="Warranty ≤90d"
            value={m?.warrantyExpiring ?? 0}
            icon={<WarningOutlined />}
            color="#cf1322"
            accent="#cf1322"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={isFetching}
            title={
              <Space>
                <PieChartOutlined />
                Status mix
              </Space>
            }
          >
            {m?.byStatus ? <StatusDonutChart byStatus={m.byStatus} /> : null}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={!locationId && byLocationQuery.isFetching}
            title={
              <Space>
                <BarChartOutlined />
                {locationId ? 'Filtered view' : 'Assets by location'}
              </Space>
            }
          >
            {locationId ? (
              <Typography.Text type="secondary" style={{ display: 'block', padding: '24px 0', textAlign: 'center' }}>
                Clear the location filter to compare all sites.
              </Typography.Text>
            ) : (
              <LocationBarChart data={byLocation} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={trendsQuery.isFetching}
            title={
              <Space>
                <LineChartOutlined />
                Assets added (12 months)
              </Space>
            }
          >
            <AssetTrendChart data={trends} />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={
          <Space>
            <ClockCircleOutlined />
            Warranty expiring soon (sorted by days remaining)
          </Space>
        }
        loading={isFetching}
      >
        <Table<WarrantyRow>
          dataSource={warrantyRows}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          columns={[
            {
              title: 'Asset',
              dataIndex: 'assetCode',
              render: (_, r) => <Link to={`/assets/show/${r.id}`}>{r.assetCode}</Link>,
            },
            {
              title: 'Item',
              render: (_, r) => `${r.brand ?? ''} ${r.model ?? ''}`.trim() || '—',
            },
            { title: 'Location', dataIndex: 'location' },
            {
              title: 'Warranty remaining',
              dataIndex: 'daysRemaining',
              defaultSortOrder: 'ascend',
              sorter: (a, b) => (a.daysRemaining ?? 1e9) - (b.daysRemaining ?? 1e9),
              render: (_, r) => <WarrantyDays warrantyEnd={r.warrantyEnd} />,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
