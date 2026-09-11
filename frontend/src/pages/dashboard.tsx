import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useCustom, useGetIdentity } from '@refinedev/core';
import { Alert, Button, Card, Col, DatePicker, Row, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isEmployee, isItConsole, isManager } from '../access';
import { STATUS_CHART_COLORS, STATUS_LABELS } from '../chartColors';
import { LocationBreakdownTable, StatusBreakdownTable } from '../components/BreakdownList';
import { ChipSelect } from '../components/ChipSelect';
import { DashSection } from '../components/DashSection';
import { FirstRunWelcome } from '../components/FirstRunWelcome';
import { KpiCard } from '../components/KpiCard';
import { LiveTimestamp } from '../components/LiveTimestamp';
import { StatusTag } from '../components/StatusTag';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { useToast } from '../components/Toast';
import { useSetupStatus } from '../hooks/useSetupStatus';
import type { Identity } from '../providers/authProvider';
import { apiErrorMessage, httpClient } from '../providers/axios';
import {
  COLOR_TEXT_MUTED,
  COLOR_TEXT_SECONDARY,
  KPI_ASSIGNED,
  KPI_AVAILABLE,
  KPI_REPAIR,
  KPI_RETIRED,
  KPI_TOTAL,
} from '../theme';
import type {
  AssetStatus,
  AttentionItem,
  DashboardAttention,
  DashboardMetrics,
  Location,
  LocationBreakdown,
  SupportTicket,
} from '../types';

interface TicketSummary {
  open: number;
  unassigned: number;
  inProgress: number;
  resolved: number;
  created: number;
  due: number;
  myDueTomorrow?: number;
  preset: string;
}

const STATUS_ORDER: AssetStatus[] = [
  'assigned',
  'available',
  'under_repair',
  'pending_assignment',
  'lost',
  'damaged',
  'retired',
  'disposed',
];

function listHref(path: string, filters: Record<string, string | number | undefined>) {
  const parts: string[] = [];
  let i = 0;
  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue;
    parts.push(
      `filters[${i}][field]=${field}&filters[${i}][operator]=eq&filters[${i}][value]=${encodeURIComponent(String(value))}`,
    );
    i += 1;
  }
  return parts.length ? `${path}?${parts.join('&')}` : path;
}

function assetsHref(filters: Record<string, string | number | undefined>) {
  return listHref('/assets', filters);
}

function ticketsHref(filters: Record<string, string | number | undefined> = {}) {
  return listHref('/tickets', filters);
}

function MyWorkList({
  items,
  onAssign,
}: {
  items: AttentionItem[];
  onAssign?: (ticketId: number) => void;
}) {
  if (items.length === 0) {
    return <Typography.Text type="secondary">Nothing in your work list right now.</Typography.Text>;
  }
  return (
    <div data-testid="my-work-list" style={{ maxHeight: 420, overflow: 'auto' }}>
      {items.map((item) => (
        <div
          key={`${item.type}-${item.id}-${item.href}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'flex-start',
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Link to={item.href}>{item.label}</Link>
            {item.detail ? (
              <div style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY }}>{item.detail}</div>
            ) : null}
          </div>
          {item.assignTicketId && onAssign ? (
            <Button size="small" onClick={() => onAssign(item.assignTicketId!)}>
              Assign to me
            </Button>
          ) : (
            <Link to={item.href} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              Open →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { data: identity } = useGetIdentity<Identity>();
  const role = identity?.role;
  if (isEmployee(role)) return <MyItHome />;
  if (isManager(role)) return <ManagerHome />;
  if (role === 'IT_SUPPORT') return <SupportHome />;
  if (isItConsole(role)) return <EstateDashboard superAdmin={role === 'SUPER_ADMIN'} />;
  return <EstateDashboard superAdmin={false} />;
}

function MyItHome() {
  const [data, setData] = useState<{
    assets: {
      id: number;
      assetCode: string;
      brand?: string | null;
      model?: string | null;
      status: AssetStatus;
      category?: string;
    }[];
    openTickets: Pick<SupportTicket, 'id' | 'ticketNumber' | 'subject' | 'status' | 'priority'>[];
  } | null>(null);

  useEffect(() => {
    httpClient
      .get('/dashboard/my-summary')
      .then(({ data: d }) => setData(d))
      .catch(() => setData({ assets: [], openTickets: [] }));
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} data-testid="my-it-home">
      <div>
        <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
          My IT
        </Typography.Title>
        <Typography.Text style={{ fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}>
          Your devices, requests, and tickets — nothing else.
        </Typography.Text>
      </div>
      <Space wrap>
        <Link to="/tickets/create">
          <Button type="primary">Raise a ticket</Button>
        </Link>
        <Link to="/requests">
          <Button>Request a device</Button>
        </Link>
      </Space>
      <Row gutter={[12, 12]}>
        {(data?.assets ?? []).map((a) => (
          <Col xs={24} sm={12} lg={8} key={a.id}>
            <Link to={`/assets/show/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card size="small" hoverable>
                <Typography.Text className="nv-mono" style={{ fontSize: 12, color: '#0958d9' }}>
                  {a.assetCode}
                </Typography.Text>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
                  {`${a.brand ?? ''} ${a.model ?? ''}`.trim() || a.category || 'Device'}
                </div>
                <div style={{ marginTop: 8 }}>
                  <StatusTag status={a.status} />
                </div>
              </Card>
            </Link>
          </Col>
        ))}
        {(data?.assets ?? []).length === 0 && (
          <Col span={24}>
            <Typography.Text type="secondary">No devices assigned to you yet.</Typography.Text>
          </Col>
        )}
      </Row>
      <Card size="small" title="Open tickets">
        {(data?.openTickets ?? []).length === 0 ? (
          <Typography.Text type="secondary">You have no open tickets.</Typography.Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {(data?.openTickets ?? []).map((t) => (
              <Link
                key={t.id}
                to={`/tickets/show/${t.id}`}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <span className="nv-mono" style={{ fontSize: 12 }}>
                  {t.ticketNumber}
                </span>
                <span style={{ flex: 1 }}>{t.subject}</span>
                <TicketStatusTag status={t.status} />
              </Link>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}

function ManagerHome() {
  const [data, setData] = useState<{
    pendingRequestCount: number;
    teamOpenTicketCount: number;
    teamDeviceCount: number;
  } | null>(null);
  useEffect(() => {
    httpClient
      .get('/dashboard/team-summary')
      .then(({ data: d }) => setData(d))
      .catch(() => undefined);
  }, []);
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} data-testid="manager-home">
      <div>
        <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
          Your team
        </Typography.Title>
        <Typography.Text style={{ fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}>
          {data
            ? `${data.pendingRequestCount} request${data.pendingRequestCount === 1 ? '' : 's'} waiting on you · ${data.teamOpenTicketCount} team tickets open · ${data.teamDeviceCount} devices in your team`
            : 'Loading team summary…'}
        </Typography.Text>
      </div>
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={8}>
          <KpiCard
            title="Pending approvals"
            value={data?.pendingRequestCount ?? 0}
            icon={<InboxOutlined />}
            accentColor={KPI_REPAIR}
            subtitle="Waiting on you"
            href="/requests"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KpiCard
            title="Team tickets"
            value={data?.teamOpenTicketCount ?? 0}
            icon={<ToolOutlined />}
            accentColor={KPI_TOTAL}
            subtitle="Open"
            href="/tickets"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KpiCard
            title="Team devices"
            value={data?.teamDeviceCount ?? 0}
            icon={<DatabaseOutlined />}
            accentColor={KPI_ASSIGNED}
            subtitle="Assigned to your reports"
          />
        </Col>
      </Row>
    </Space>
  );
}

function SupportHome() {
  const toast = useToast();
  const { query: attentionQuery } = useCustom<DashboardAttention>({
    url: 'dashboard/attention',
    method: 'get',
    queryOptions: { queryKey: ['dashboard-attention-support'] },
  });
  const attention = attentionQuery.data?.data;
  const work = attention?.myWork ?? attention?.staleRepairs ?? [];
  const assign = async (ticketId: number) => {
    try {
      await httpClient.post(`/support-tickets/${ticketId}/assign-to-me`);
      toast.success('Assigned to you');
      void attentionQuery.refetch();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not assign ticket'));
    }
  };
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} data-testid="support-home">
      <div>
        <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
          Queue
        </Typography.Title>
        <Typography.Text style={{ fontSize: 12.5, color: COLOR_TEXT_SECONDARY }}>
          Ordered work list — overdue mine, unassigned, waiting, stale repairs, then estate
          follow-ups.
        </Typography.Text>
      </div>
      <Space wrap>
        <Link to="/tickets?filters[0][field]=unassigned&filters[0][operator]=eq&filters[0][value]=true">
          <Button type="primary">Unassigned tickets</Button>
        </Link>
        <Link to="/tickets?view=mine">
          <Button>My tickets</Button>
        </Link>
        <Link to="/maintenance?filters[0][field]=staleDays&filters[0][operator]=eq&filters[0][value]=14">
          <Button>Stale repairs</Button>
        </Link>
      </Space>
      <DashSection collapseKey="my-work" title="My work" count={work.length} testId="my-work">
        <MyWorkList items={work} onAssign={(id) => void assign(id)} />
      </DashSection>
    </Space>
  );
}

function EstateDashboard({ superAdmin }: { superAdmin: boolean }) {
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
  const [overrides, setOverrides] = useState<{ id: number; summary: string; createdAt: string }[]>(
    [],
  );
  const { freshInstall, seedOnStart } = useSetupStatus();

  useEffect(() => {
    httpClient
      .get('/locations', { params: { _start: 0, _end: 100 } })
      .then(({ data }) => setLocations(data.data ?? []))
      .catch(() => setLocations([]));
    if (superAdmin) {
      httpClient
        .get('/audit-logs', { params: { _start: 0, _end: 5, action: 'manual_override' } })
        .then(({ data }) => setOverrides(data.data ?? []))
        .catch(() => undefined);
    }
  }, [superAdmin]);

  const { query: metricsQuery } = useCustom<DashboardMetrics>({
    url: 'dashboard/metrics',
    method: 'get',
    config: { query: locationId ? { locationId } : {} },
    queryOptions: { queryKey: ['dashboard-metrics', locationId] },
  });
  const m = metricsQuery.data?.data;
  const isFetching = metricsQuery.isFetching;
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  useEffect(() => {
    if (m) setLastUpdated(Date.now());
  }, [m]);

  const [ticketPreset, setTicketPreset] = useState<'today' | 'yesterday' | 'tomorrow' | 'range'>(
    'today',
  );
  const [ticketRange, setTicketRange] = useState<[string, string] | null>(null);
  const { query: ticketsQuery } = useCustom<TicketSummary>({
    url: 'dashboard/tickets',
    method: 'get',
    config: {
      query: {
        preset: ticketPreset,
        ...(ticketPreset === 'range' && ticketRange
          ? { from: ticketRange[0], to: ticketRange[1] }
          : {}),
      },
    },
    queryOptions: { queryKey: ['dashboard-tickets', ticketPreset, ticketRange?.join(':')] },
  });
  const ticketSummary = ticketsQuery.data?.data;

  const { query: attentionQuery } = useCustom<DashboardAttention>({
    url: 'dashboard/attention',
    method: 'get',
    config: { query: locationId ? { locationId } : {} },
    queryOptions: { queryKey: ['dashboard-attention', locationId] },
  });
  const attention = attentionQuery.data?.data;
  const workItems = attention?.myWork ?? [
    ...(attention?.warrantyUrgent ?? []),
    ...(attention?.staleRepairs ?? []),
    ...(attention?.lowStock ?? []),
    ...(attention?.toFulfill ?? []),
  ];
  const toast = useToast();
  const assignWork = async (ticketId: number) => {
    try {
      await httpClient.post(`/support-tickets/${ticketId}/assign-to-me`);
      toast.success('Assigned to you');
      void attentionQuery.refetch();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not assign ticket'));
    }
  };

  const { query: byLocationQuery } = useCustom<LocationBreakdown[]>({
    url: 'dashboard/by-location',
    method: 'get',
    queryOptions: { queryKey: ['dashboard-by-location'], enabled: !locationId },
  });
  const byLocation = byLocationQuery.data?.data ?? [];

  const loadFailed = metricsQuery.isError || ticketsQuery.isError || attentionQuery.isError;
  const retryAll = () => {
    void metricsQuery.refetch();
    void ticketsQuery.refetch();
    void attentionQuery.refetch();
    if (!locationId) void byLocationQuery.refetch();
  };

  const siteLine = locations.length
    ? locations.map((l) => l.city || l.name).join(', ')
    : 'your locations';
  const total = m?.total ?? 0;
  const statusItems = STATUS_ORDER.filter((status) => (m?.byStatus?.[status] ?? 0) > 0).map(
    (status) => {
      const count = m?.byStatus?.[status] ?? 0;
      return {
        key: status,
        status,
        label: STATUS_LABELS[status],
        percent: total ? `${Math.round((count / total) * 100)}%` : undefined,
        count,
        color: STATUS_CHART_COLORS[status],
        href: assetsHref({ status, locationId }),
      };
    },
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }} data-testid="estate-dashboard">
      {seedOnStart && (
        <Alert
          type="warning"
          showIcon
          message="SEED_ON_START is on — restarting the backend will wipe and reseed demo data. Set SEED_ON_START=false after first boot."
        />
      )}
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
            {freshInstall ? (
              'Empty estate — follow the setup steps below.'
            ) : (
              <>
                {`${total.toLocaleString()} assets across ${siteLine}. `}
                <LiveTimestamp at={lastUpdated} refreshing={isFetching} />
              </>
            )}
          </Typography.Text>
        </Col>
        {!freshInstall && (
          <Col>
            <ChipSelect
              tone="location"
              aria-label="Filter dashboard by location"
              allowClear
              placeholder="All locations"
              value={locationId}
              onChange={(v) => setLocationId(v as number | undefined)}
              options={locations.map((l) => ({ label: `${l.name} (${l.code})`, value: l.id }))}
            />
          </Col>
        )}
      </Row>

      {freshInstall ? (
        <FirstRunWelcome />
      ) : (
        <>
          {superAdmin && (
            <Card size="small" title="Super Admin">
              <Space wrap>
                <Link to="/settings?tab=users">Manage users →</Link>
                <Link to="/audit-logs">Audit log →</Link>
              </Space>
              {overrides.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: COLOR_TEXT_SECONDARY }}>
                  Recent manual overrides: {overrides.map((o) => o.summary).join(' · ')}
                </div>
              )}
            </Card>
          )}
          <Row gutter={[10, 10]}>
            <Col xs={12} sm={8} lg={4}>
              <KpiCard
                title="Total Assets"
                value={total}
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
                title="Open tickets"
                value={ticketSummary?.open ?? 0}
                icon={<CustomerServiceOutlined />}
                accentColor={KPI_REPAIR}
                href={ticketsHref()}
                subtitle="Estate support queue"
              />
            </Col>
          </Row>

          <DashSection
            collapseKey="my-work"
            className="nv-attention-panel"
            testId="my-work"
            count={workItems.length}
            title={
              <Space>
                <AlertOutlined style={{ color: KPI_REPAIR }} />
                <Typography.Text strong style={{ fontSize: 13 }}>
                  My work
                </Typography.Text>
              </Space>
            }
            extra={
              <Link
                to={assetsHref({ warrantyExpiringInDays: 14, locationId })}
                style={{ fontSize: 12 }}
              >
                Expiring (14d)
              </Link>
            }
          >
            <MyWorkList items={workItems} onAssign={(id) => void assignWork(id)} />
          </DashSection>

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Status distribution"
                extra={
                  <Typography.Text style={{ fontSize: 11.5, color: COLOR_TEXT_MUTED }}>
                    All categories
                  </Typography.Text>
                }
              >
                <StatusBreakdownTable items={statusItems} empty="No assets yet." />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="Assets by location">
                {locationId ? (
                  <Typography.Text type="secondary">
                    Clear the location filter to compare all sites.
                  </Typography.Text>
                ) : (
                  <LocationBreakdownTable
                    rows={byLocation.map((l) => ({
                      key: String(l.locationId ?? l.code),
                      name: l.name || l.city || l.code,
                      total: l.total,
                      href: assetsHref({ locationId: l.locationId }),
                      byStatus: l.byStatus ?? {},
                      statusHref: (status) => assetsHref({ locationId: l.locationId, status }),
                    }))}
                    empty="No location breakdown yet."
                  />
                )}
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined />
                Support tickets
              </Space>
            }
            extra={
              <Space size={8} wrap>
                {(['today', 'yesterday', 'tomorrow'] as const).map((p) => (
                  <Button
                    key={p}
                    size="small"
                    type={ticketPreset === p ? 'primary' : 'default'}
                    onClick={() => setTicketPreset(p)}
                  >
                    {p[0].toUpperCase() + p.slice(1)}
                  </Button>
                ))}
                <DatePicker.RangePicker
                  size="small"
                  onChange={(vals) => {
                    if (!vals?.[0] || !vals?.[1]) {
                      setTicketRange(null);
                      setTicketPreset('today');
                      return;
                    }
                    setTicketRange([vals[0].format('YYYY-MM-DD'), vals[1].format('YYYY-MM-DD')]);
                    setTicketPreset('range');
                  }}
                />
                <Link to="/tickets" style={{ fontSize: 12 }}>
                  Open queue
                </Link>
              </Space>
            }
            loading={ticketsQuery.isFetching}
          >
            <Row gutter={[10, 10]}>
              {[
                { label: 'Open', value: ticketSummary?.open ?? 0, href: ticketsHref() },
                {
                  label: 'Unassigned',
                  value: ticketSummary?.unassigned ?? 0,
                  href: ticketsHref({ view: 'unassigned' }),
                },
                {
                  label: 'In progress',
                  value: ticketSummary?.inProgress ?? 0,
                  href: ticketsHref({ status: 'in_progress' }),
                },
                {
                  label: 'My due tomorrow',
                  value: ticketSummary?.myDueTomorrow ?? 0,
                  href: ticketsHref({ view: 'due_tomorrow' }),
                },
                {
                  label: ticketPreset === 'tomorrow' ? 'Due' : 'Resolved in window',
                  value:
                    ticketPreset === 'tomorrow'
                      ? (ticketSummary?.due ?? 0)
                      : (ticketSummary?.resolved ?? 0),
                  href: ticketsHref({ status: 'resolved' }),
                },
                {
                  label: 'Created in window',
                  value: ticketSummary?.created ?? 0,
                  href: ticketsHref(),
                },
              ].map((cell) => (
                <Col xs={12} sm={8} md={4} key={cell.label}>
                  <Link to={cell.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#eef4fb',
                        borderRadius: 8,
                        border: '1px solid #d5dee8',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                        {cell.label}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {cell.value.toLocaleString()}
                      </div>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </>
      )}
    </Space>
  );
}
