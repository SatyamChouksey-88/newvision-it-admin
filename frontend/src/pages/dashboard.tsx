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
import { Alert, Button, Card, Col, List, Row, Select, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CHART_PALETTE, STATUS_CHART_COLORS, STATUS_LABELS } from '../chartColors';
import { BreakdownList } from '../components/BreakdownList';
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
  AssetStatus,
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

/** Build a Refine-compatible `/assets` drill-down URL for a set of eq filters. */
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

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = Number(searchParams.get('locationId'));
  const locationId =
    Number.isFinite(locationParam) && locationParam > 0 ? locationParam : undefined;
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
  const [locations, setLocations] = useState<Location[]>([]);

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

  const loadFailed =
    metricsQuery.isError || warrantyQuery.isError || attentionQuery.isError || trendsQuery.isError;
  const retryAll = () => {
    void metricsQuery.refetch();
    void warrantyQuery.refetch();
    void attentionQuery.refetch();
    void trendsQuery.refetch();
    if (!locationId) void byLocationQuery.refetch();
  };

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
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
      <Row justify="space-between" align="middle" gutter={[16, 12]}>
        <Col>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 600, fontSize: 24 }}>
            Dashboard
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: COLOR_TEXT_MUTED }}>
            Fleet overview and items needing attention
          </Typography.Text>
        </Col>
        <Col>
          <Select
            allowClear
            aria-label="Filter dashboard by location"
            placeholder="All locations"
            style={{ width: 220 }}
            value={locationId}
            onChange={(v) => setLocationId(v)}
            options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
          />
        </Col>
      </Row>

      {attentionItems.length > 0 && (
        <Card
          size="small"
          className="nv-attention-panel"
          title={
            <Space>
              <AlertOutlined style={{ color: KPI_WARRANTY }} />
              <Typography.Text strong style={{ fontSize: 14 }}>
                Needs attention
              </Typography.Text>
              {attention?.pendingRequestCount ? (
                <Typography.Text style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY }}>
                  {attention.pendingRequestCount} pending request
                  {attention.pendingRequestCount === 1 ? '' : 's'}
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
                <Space size={8}>
                  <AlertOutlined style={{ color: KPI_WARRANTY, fontSize: 12 }} aria-hidden />
                  <Link to={item.href} style={{ fontSize: 13 }}>
                    <Typography.Text strong style={{ fontSize: 13, color: 'inherit' }}>
                      {item.label}
                    </Typography.Text>
                    <Typography.Text
                      style={{ fontSize: 12, marginLeft: 8, color: COLOR_TEXT_SECONDARY }}
                    >
                      {item.detail}
                    </Typography.Text>
                  </Link>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Total Assets"
            value={m?.total ?? 0}
            icon={<DatabaseOutlined />}
            accentColor={KPI_TOTAL}
            href={assetsHref({ locationId })}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Assigned"
            value={m?.assigned ?? 0}
            icon={<CheckCircleOutlined />}
            accentColor={KPI_ASSIGNED}
            valueColor="#15803D"
            href={assetsHref({ status: 'assigned', locationId })}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Available"
            value={m?.available ?? 0}
            icon={<MinusCircleOutlined />}
            accentColor={KPI_AVAILABLE}
            href={assetsHref({ status: 'available', locationId })}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Under Repair"
            value={m?.underRepair ?? 0}
            icon={<ToolOutlined />}
            accentColor={KPI_REPAIR}
            valueColor="#B45309"
            href={assetsHref({ status: 'under_repair', locationId })}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Retired"
            value={m?.retired ?? 0}
            icon={<InboxOutlined />}
            accentColor={KPI_RETIRED}
            href={assetsHref({ status: 'retired', locationId })}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <KpiCard
            title="Warranty ≤90d"
            value={m?.warrantyExpiring ?? 0}
            icon={<WarningOutlined />}
            accentColor={KPI_WARRANTY}
            valueColor="#B91C1C"
            href={assetsHref({ warrantyExpiringInDays: 90, locationId })}
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
                <PieChartOutlined style={{ color: COLOR_ACCENT }} />
                Status mix
              </Space>
            }
          >
            <BreakdownList
              empty="No assets in this view"
              items={(
                Object.entries(m?.byStatus ?? {}) as [AssetStatus, number][]
              ).map(([status, count]) => ({
                key: status,
                label: STATUS_LABELS[status] ?? status,
                count,
                color: STATUS_CHART_COLORS[status] ?? '#64748B',
                href: assetsHref({ status, locationId }),
              }))}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            size="small"
            loading={!locationId && byLocationQuery.isFetching}
            title={
              <Space>
                <EnvironmentOutlined style={{ color: COLOR_ACCENT }} />
                {locationId ? 'Filtered view' : 'Assets by location'}
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
              <BreakdownList
                empty="No locations"
                items={byLocation.map((l, i) => ({
                  key: String(l.locationId),
                  label: `${l.name} (${l.code})`,
                  count: l.total,
                  color: CHART_PALETTE[i % CHART_PALETTE.length],
                  href: assetsHref({ locationId: l.locationId }),
                }))}
              />
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
                Assets added (12 months)
              </Space>
            }
          >
            <BreakdownList
              empty="No assets added in the last 12 months"
              items={[...trends].reverse().map((t, i) => ({
                key: t.month,
                label: t.label,
                count: t.count,
                color: CHART_PALETTE[i % CHART_PALETTE.length],
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={
          <Space>
            <ClockCircleOutlined style={{ color: COLOR_ACCENT }} />
            Warranty expiring soon
          </Space>
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
