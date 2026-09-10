import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  PieChartOutlined,
  PlusCircleOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useCustom } from '@refinedev/core';
import { Alert, Button, Card, Col, Row, Select, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AssetTrendChart } from '../components/charts/AssetTrendChart';
import { LocationBarChart } from '../components/charts/LocationBarChart';
import { StatusDonutChart } from '../components/charts/StatusDonutChart';
import { WarrantyDays } from '../components/Cells';
import { DataGrid } from '../components/DataGrid/DataGrid';
import { KpiCard } from '../components/KpiCard';
import { httpClient } from '../providers/axios';
import {
  COLOR_ACCENT,
  COLOR_TEXT_MUTED,
  COLOR_TEXT_SECONDARY,
  KPI_ASSIGNED,
  KPI_AVAILABLE,
  KPI_REPAIR,
  KPI_RETIRED,
  KPI_TOTAL,
  KPI_WARRANTY,
} from '../theme';
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

function assetsHref(filters: Record<string, string | number | undefined>) {
  const parts: string[] = [];
  let i = 0;
  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue;
    parts.push(
      `filters[${i}][field]=${field}&filters[${i}][operator]=eq&filters[${i}][value]=${encodeURIComponent(String(value))}`,
    );
    i += 1;
  }
  return parts.length ? `/assets?${parts.join('&')}` : '/assets';
}

const DISMISS_KEY = 'nv:attention-dismissed';

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = Number(searchParams.get('locationId'));
  const locationId =
    Number.isFinite(locationParam) && locationParam > 0 ? locationParam : undefined;
  const monthsParam = Number(searchParams.get('months'));
  const months = [6, 12, 24].includes(monthsParam) ? monthsParam : 12;
  const setLocationId = (v?: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set('locationId', String(v));
        else next.delete('locationId');
        return next;
      },
      { replace: true },
    );
  const setMonths = (v: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === 12) next.delete('months');
        else next.set('months', String(v));
        return next;
      },
      { replace: true },
    );

  const [locations, setLocations] = useState<Location[]>([]);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    httpClient
      .get('/locations', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setLocations(data.data ?? []))
      .catch(() => setLocations([]));
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
    config: { query: { months, ...(locationId ? { locationId } : {}) } },
    queryOptions: { queryKey: ['dashboard-trends', locationId, months] },
  });
  const trends = trendsQuery.data?.data ?? [];

  const { query: byLocationQuery } = useCustom<LocationBreakdown[]>({
    url: 'dashboard/by-location',
    method: 'get',
    queryOptions: { queryKey: ['dashboard-by-location'], enabled: !locationId },
  });
  const byLocation = byLocationQuery.data?.data ?? [];

  const loadFailed =
    metricsQuery.isError || warrantyQuery.isError || attentionQuery.isError || trendsQuery.isError;
  const retryAll = () => {
    void metricsQuery.refetch();
    void warrantyQuery.refetch();
    void attentionQuery.refetch();
    void trendsQuery.refetch();
    if (!locationId) void byLocationQuery.refetch();
  };

  const dismissAll = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {loadFailed && (
        <Alert
          type="error"
          showIcon
          message="Some dashboard data could not be loaded"
          action={
            <Button size="small" onClick={retryAll}>
              Retry
            </Button>
          }
        />
      )}
      <Row justify="space-between" align="bottom" gutter={[16, 12]}>
        <Col>
          <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
            Dashboard
          </Typography.Title>
          <Typography.Text style={{ fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}>
            {(m?.total ?? 0).toLocaleString()} assets across Pune, Hyderabad and Bhopal.
          </Typography.Text>
        </Col>
        <Col>
          <Space>
            <Select
              aria-label="Trend window"
              style={{ width: 160 }}
              value={months}
              onChange={setMonths}
              options={[
                { label: 'Last 6 months', value: 6 },
                { label: 'Last 12 months', value: 12 },
                { label: 'Last 24 months', value: 24 },
              ]}
            />
            <Select
              allowClear
              aria-label="Filter dashboard by location"
              placeholder="All locations"
              style={{ width: 200 }}
              value={locationId}
              onChange={(v) => setLocationId(v)}
              options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={[10, 10]}>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Total Assets"
            value={m?.total ?? 0}
            icon={<DatabaseOutlined />}
            accentColor={KPI_TOTAL}
            href={assetsHref({ locationId })}
            subtitle="Entire estate"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Assigned"
            value={m?.assigned ?? 0}
            icon={<CheckCircleOutlined />}
            accentColor={KPI_ASSIGNED}
            href={assetsHref({ status: 'assigned', locationId })}
            subtitle="In the field"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Available"
            value={m?.available ?? 0}
            icon={<MinusCircleOutlined />}
            accentColor={KPI_AVAILABLE}
            href={assetsHref({ status: 'available', locationId })}
            subtitle="Ready to issue"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Under Repair"
            value={m?.underRepair ?? 0}
            icon={<ToolOutlined />}
            accentColor={KPI_REPAIR}
            href={assetsHref({ status: 'under_repair', locationId })}
            subtitle="Open tickets"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Retired"
            value={m?.retired ?? 0}
            icon={<InboxOutlined />}
            accentColor={KPI_RETIRED}
            href={assetsHref({ status: 'retired', locationId })}
            subtitle="End of life"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Warranty ≤90d"
            value={m?.warrantyExpiring ?? 0}
            icon={<WarningOutlined />}
            accentColor={KPI_WARRANTY}
            href={assetsHref({ warrantyExpiringInDays: 90, locationId })}
            subtitle="Needs renewal"
          />
        </Col>
      </Row>

      {!dismissed && attentionItems.length > 0 && (
        <Card
          size="small"
          className="nv-attention-panel"
          title={
            <Space>
              <AlertOutlined style={{ color: KPI_REPAIR }} />
              <Typography.Text strong style={{ fontSize: 13 }}>
                Needs attention
              </Typography.Text>
              <Typography.Text style={{ fontSize: 11.5, color: COLOR_TEXT_MUTED }}>
                {attentionItems.length} item{attentionItems.length === 1 ? '' : 's'}
                {attention?.pendingRequestCount
                  ? ` · ${attention.pendingRequestCount} pending request${
                      attention.pendingRequestCount === 1 ? '' : 's'
                    }`
                  : ''}
              </Typography.Text>
            </Space>
          }
          extra={
            <Button type="link" size="small" onClick={dismissAll}>
              Dismiss all
            </Button>
          }
        >
          <div className="nv-attention-grid">
            {attentionItems.slice(0, 8).map((item) => (
              <div key={`${item.href}-${item.label}`} className="nv-attention-item">
                <Typography.Text strong style={{ fontSize: 12.5, display: 'block' }}>
                  {item.label}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 11.5, color: COLOR_TEXT_SECONDARY }}>
                  {item.detail}
                </Typography.Text>
                <div>
                  <Link to={item.href} style={{ fontSize: 11.5 }}>
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={isFetching}
            title={
              <Space>
                <PieChartOutlined style={{ color: COLOR_ACCENT }} />
                Status distribution
              </Space>
            }
          >
            <Typography.Text style={{ fontSize: 11.5, color: COLOR_TEXT_MUTED, display: 'block', marginBottom: 8 }}>
              All categories
            </Typography.Text>
            <StatusDonutChart byStatus={m?.byStatus ?? {}} height={240} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={!locationId && byLocationQuery.isFetching}
            title={
              <Space>
                <EnvironmentOutlined style={{ color: COLOR_ACCENT }} />
                Assets by location
              </Space>
            }
          >
            {locationId ? (
              <Typography.Text
                type="secondary"
                style={{ display: 'block', padding: '24px 0', textAlign: 'center', fontSize: 13 }}
              >
                Clear the location filter to compare all sites.
              </Typography.Text>
            ) : (
              <LocationBarChart data={byLocation} height={240} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={trendsQuery.isFetching}
            title={
              <Space>
                <PlusCircleOutlined style={{ color: COLOR_ACCENT }} />
                Growth ({months} months)
              </Space>
            }
          >
            <AssetTrendChart data={trends} height={240} />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={
          <Space>
            <ClockCircleOutlined style={{ color: COLOR_ACCENT }} />
            Warranty expiring
          </Space>
        }
        extra={
          <Link to={assetsHref({ warrantyExpiringInDays: 90, locationId })} style={{ fontSize: 12 }}>
            View all on Assets
          </Link>
        }
        loading={isFetching}
      >
        <DataGrid<WarrantyRow>
          tableKey="dashboard-warranty"
          dataSource={warrantyRows}
          rowKey="id"
          density="Compact"
          pagination={{ pageSize: 8, size: 'small', hideOnSinglePage: true }}
          columns={[
            {
              title: 'Asset',
              dataIndex: 'assetCode',
              render: (_, r) => <Link to={`/assets/show/${r.id}`}>{r.assetCode}</Link>,
            },
            {
              title: 'Item',
              gridKey: 'item',
              render: (_, r) => `${r.brand ?? ''} ${r.model ?? ''}`.trim() || '—',
              getExportValue: (r) => `${r.brand ?? ''} ${r.model ?? ''}`.trim(),
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
