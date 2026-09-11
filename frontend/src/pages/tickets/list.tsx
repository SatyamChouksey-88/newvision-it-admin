import { DownloadOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons';
import { useTable } from '@refinedev/antd';
import { useGetIdentity } from '@refinedev/core';
import { Button, Card, Dropdown, Form, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CopyButton } from '../../components/CopyButton';
import { CopyEmailButton } from '../../components/CopyEmailButton';
import { DataGrid, type TableDensity } from '../../components/DataGrid/DataGrid';
import { EmptyState } from '../../components/EmptyState';
import { StatusLegend } from '../../components/StatusLegend';
import { TablePagination } from '../../components/TablePagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import {
  TICKET_STATUS_OPTIONS,
  TicketPriorityTag,
  TicketStatusTag,
} from '../../components/TicketStatusTag';
import { useToast } from '../../components/Toast';
import { useRefinePagination } from '../../hooks/useRefinePagination';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { SavedView, SupportTicket } from '../../types';
import { formatDate } from '../../utils/format';

const STAFF = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];

function requesterLabel(
  emp?: { firstName?: string; lastName?: string; employeeCode?: string } | null,
) {
  if (!emp) return '—';
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
  return emp.employeeCode ? `${name} · ${emp.employeeCode}` : name;
}

function assigneeLabel(user?: SupportTicket['assignedTo']) {
  if (!user) return 'Unassigned';
  const code = user.employee?.employeeCode;
  return code ? `${user.fullName} · ${code}` : user.fullName;
}

function ageLabel(iso?: string) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function SlaTag({ ticket }: { ticket: SupportTicket }) {
  if (ticket.slaLabel) {
    return (
      <Tag
        color={
          ticket.slaState === 'overdue' ? 'red' : ticket.slaState === 'soon' ? 'gold' : undefined
        }
      >
        {ticket.slaLabel}
      </Tag>
    );
  }
  if (ticket.overdue) return <Tag color="red">Overdue</Tag>;
  return null;
}

const QUICK_VIEWS = [
  { key: '', label: 'All' },
  { key: 'mine', label: 'My tickets' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'due_tomorrow', label: 'Due tomorrow' },
  { key: 'awaiting_reply', label: 'Awaiting reply' },
  { key: 'email', label: 'Email-in' },
];

const LAST_VIEW_KEY = 'nv.tickets.lastView';

export function TicketList() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const isStaff = STAFF.includes(identity?.role ?? '');
  const restoredView = useRef(false);
  const [density, setDensity] = useState<TableDensity>('Compact');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [views, setViews] = useState<SavedView[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkCloseOpen, setBulkCloseOpen] = useState(false);
  const [staff, setStaff] = useState<{ id: number; fullName: string }[]>([]);
  const [assignForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  const { tableProps, filters, setFilters, tableQuery } = useTable<SupportTicket>({
    resource: 'support-tickets',
    syncWithLocation: true,
    pagination: { pageSize: 25 },
  });
  const { page, pageSize, total, onPageChange } = useRefinePagination(tableProps);
  const rows = tableProps.dataSource ?? [];

  const activeFilters = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of filters ?? []) {
      if ('field' in f && f.value !== undefined && f.value !== null && f.value !== '')
        out[f.field] = f.value;
    }
    return out;
  }, [filters]);

  const applyFilterState = (next: Record<string, unknown>) => {
    setFilters(
      Object.entries(next)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([field, value]) => ({
          field,
          operator: field === 'q' ? ('contains' as const) : ('eq' as const),
          value,
        })),
      'replace',
    );
    setSelectedIds([]);
    if (isStaff) {
      try {
        localStorage.setItem(LAST_VIEW_KEY, String(next.view ?? ''));
      } catch {
        /* ignore quota */
      }
    }
  };

  // one-shot restore of the last staff queue view
  // biome-ignore lint/correctness/useExhaustiveDependencies: applyFilterState/search are intentionally excluded — this must run exactly once on mount, guarded by restoredView.current
  useEffect(() => {
    if (!isStaff || restoredView.current) return;
    restoredView.current = true;
    if (new URLSearchParams(search).toString()) return;
    try {
      const saved = localStorage.getItem(LAST_VIEW_KEY);
      if (saved) applyFilterState({ view: saved });
    } catch {
      /* ignore */
    }
  }, [isStaff]);

  const assignToMe = async (id: number, e?: MouseEvent) => {
    e?.stopPropagation();
    try {
      await httpClient.post(`/support-tickets/${id}/assign-to-me`);
      toast.success('Assigned to you');
      void tableQuery.refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not assign ticket'));
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh counts when the table query updates
  useEffect(() => {
    httpClient
      .get('/support-tickets/counts')
      .then(({ data }) => {
        setCounts(data.byStatus ?? {});
      })
      .catch(() => undefined);
    httpClient
      .get('/saved-views', { params: { resource: 'support-tickets', _start: 0, _end: 50 } })
      .then(({ data }) => setViews(data.data ?? []))
      .catch(() => undefined);
    if (isStaff) {
      httpClient
        .get('/support-tickets/staff')
        .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
        .catch(() => undefined);
    }
  }, [isStaff, tableQuery.dataUpdatedAt]);

  const exportFile = async (format: 'csv' | 'pdf') => {
    const res = await httpClient.get('/support-tickets/export', {
      params: { format, ...activeFilters },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveView = async (name: string) => {
    const { data } = await httpClient.post('/saved-views', {
      name,
      resource: 'support-tickets',
      filters: activeFilters,
      isShared: false,
    });
    setViews((v) => [data, ...v]);
    setSaveOpen(false);
  };

  return (
    <Card
      title={
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Support Tickets
          </Typography.Title>
          {isStaff ? <Link to="/tickets/reports">Reports</Link> : null}
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate('/tickets/create')}
            data-testid="raise-ticket"
          >
            Raise a ticket
          </Button>
        </Space>
      }
    >
      <div className="nv-filter-row">
        {TICKET_STATUS_OPTIONS.map((s) => (
          <Tag.CheckableTag
            key={s.value}
            checked={activeFilters.status === s.value}
            onChange={() =>
              applyFilterState({
                ...activeFilters,
                status: activeFilters.status === s.value ? undefined : s.value,
                view: undefined,
              })
            }
          >
            {s.label}
            {counts[s.value] != null ? ` (${counts[s.value]})` : ''}
          </Tag.CheckableTag>
        ))}
        {isStaff ? (
          <>
            <span className="nv-filter-divider" aria-hidden />
            {QUICK_VIEWS.map((v) => (
              <Button
                key={v.key || 'all'}
                size="small"
                type={String(activeFilters.view ?? '') === v.key ? 'primary' : 'default'}
                data-testid={`quick-view-${v.key || 'all'}`}
                onClick={() =>
                  applyFilterState({
                    ...activeFilters,
                    view: v.key || undefined,
                    status: undefined,
                  })
                }
              >
                {v.label}
              </Button>
            ))}
            {views.map((sv) => (
              <Button key={sv.id} size="small" onClick={() => applyFilterState(sv.filters)}>
                {sv.name}
              </Button>
            ))}
            <Button size="small" onClick={() => setSaveOpen(true)}>
              Save view
            </Button>
          </>
        ) : null}
      </div>
      {tableQuery.isLoading ? (
        <TableSkeleton columns={6} />
      ) : tableQuery.isError ? (
        <EmptyState
          description="Could not load tickets."
          actionLabel="Retry"
          onAction={() => void tableQuery.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description={
            activeFilters.q || activeFilters.status || activeFilters.view
              ? 'No tickets match these filters.'
              : 'No tickets yet.'
          }
          actionLabel="Raise a ticket"
          onAction={() => navigate('/tickets/create')}
        />
      ) : (
        <>
          <DataGrid<SupportTicket>
            tableKey="support-tickets"
            dataSource={rows}
            rowKey="id"
            density={density}
            onDensityChange={setDensity}
            serverSide
            onChange={tableProps.onChange}
            searchInputId="ticket-search"
            enableQueueKeys={isStaff}
            onOpenRow={(r) => navigate(`/tickets/show/${r.id}`)}
            onAssignToMe={(r) => void assignToMe(r.id)}
            onRow={(r) => ({ onClick: () => navigate(`/tickets/show/${r.id}`) })}
            toolbarLead={
              <div className="nv-grid-search">
                <Input.Search
                  id="ticket-search"
                  allowClear
                  placeholder="Search tickets"
                  aria-label="Search tickets"
                  defaultValue={String(activeFilters.q ?? '')}
                  onSearch={(q) => applyFilterState({ ...activeFilters, q: q || undefined })}
                />
              </div>
            }
            hideClientExport={isStaff}
            rowSelection={
              isStaff
                ? {
                    selectedRowKeys: selectedIds,
                    onChange: (keys) => setSelectedIds(keys as number[]),
                    columnTitle: (checkbox) => <span title="Select all tickets">{checkbox}</span>,
                  }
                : undefined
            }
            bulkActions={
              isStaff && selectedIds.length > 0 ? (
                <Space>
                  <Button size="small" onClick={() => setBulkAssignOpen(true)}>
                    Bulk assign
                  </Button>
                  <Button size="small" danger onClick={() => setBulkCloseOpen(true)}>
                    Bulk close
                  </Button>
                </Space>
              ) : undefined
            }
            toolbarExtra={
              <>
                <StatusLegend kind="ticket" />
                {isStaff ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'csv', label: 'CSV', onClick: () => void exportFile('csv') },
                        { key: 'pdf', label: 'PDF', onClick: () => void exportFile('pdf') },
                      ],
                    }}
                  >
                    <Button size="small" icon={<DownloadOutlined />} aria-label="Export tickets">
                      Export <DownOutlined />
                    </Button>
                  </Dropdown>
                ) : null}
              </>
            }
            columns={[
              {
                title: 'Ticket',
                dataIndex: 'ticketNumber',
                defaultWidth: 140,
                render: (v: string, r) => (
                  <Space size={4}>
                    <Link to={`/tickets/show/${r.id}`}>{v}</Link>
                    <CopyButton value={v} label="ticket number" />
                    {isStaff ? <CopyEmailButton compact ticket={r} /> : null}
                    {r.channel === 'email' ? <Tag>Email</Tag> : null}
                  </Space>
                ),
              },
              { title: 'Subject', dataIndex: 'subject', defaultWidth: 240, ellipsis: true },
              {
                title: 'Requester',
                gridKey: 'requester',
                defaultWidth: 180,
                ellipsis: true,
                render: (_, r) => requesterLabel(r.raisedBy),
                getExportValue: (r) => requesterLabel(r.raisedBy),
              },
              {
                title: 'Assignee',
                gridKey: 'assignee',
                defaultWidth: 160,
                ellipsis: true,
                render: (_, r) => assigneeLabel(r.assignedTo),
                getExportValue: (r) => assigneeLabel(r.assignedTo),
              },
              {
                title: 'Age / SLA',
                gridKey: 'ageSla',
                defaultWidth: 160,
                render: (_, r) => (
                  <Space size={4} wrap>
                    <span>{ageLabel(r.createdAt)}</span>
                    <SlaTag ticket={r} />
                  </Space>
                ),
                getExportValue: (r) =>
                  [ageLabel(r.createdAt), r.slaLabel ?? (r.overdue ? 'Overdue' : '')]
                    .filter(Boolean)
                    .join(' '),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                defaultWidth: 140,
                render: (v) => <TicketStatusTag status={v} />,
              },
              {
                title: 'Priority',
                dataIndex: 'priority',
                defaultWidth: 120,
                render: (v) => <TicketPriorityTag priority={v} />,
              },
              {
                title: 'Category',
                gridKey: 'category',
                defaultWidth: 140,
                render: (_, r) => r.category?.name ?? '—',
                getExportValue: (r) => r.category?.name ?? '',
              },
              {
                title: 'Updated',
                dataIndex: 'updatedAt',
                defaultWidth: 140,
                sorter: true,
                render: (v) => formatDate(v),
              },
              ...(isStaff
                ? [
                    {
                      title: 'Actions',
                      gridKey: 'actions',
                      defaultWidth: 120,
                      exportable: false as const,
                      render: (_: unknown, r: SupportTicket) =>
                        r.assignedToId === identity?.id ? null : (
                          <Button size="small" onClick={(e) => void assignToMe(r.id, e)}>
                            Assign to me
                          </Button>
                        ),
                    },
                  ]
                : []),
            ]}
          />
          <TablePagination total={total} page={page} pageSize={pageSize} onChange={onPageChange} />
        </>
      )}
      <Modal
        title="Save current view"
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        footer={null}
      >
        <Form onFinish={(v) => void saveView(v.name)}>
          <Form.Item name="name" rules={[{ required: true }]}>
            <Input placeholder="View name" />
          </Form.Item>
          <Button htmlType="submit" type="primary">
            Save
          </Button>
        </Form>
      </Modal>
      <Modal
        title="Bulk assign"
        open={bulkAssignOpen}
        onCancel={() => setBulkAssignOpen(false)}
        onOk={async () => {
          const v = await assignForm.validateFields();
          try {
            await httpClient.post('/support-tickets/bulk-assign', {
              ids: selectedIds,
              userId: v.userId,
            });
            setBulkAssignOpen(false);
            setSelectedIds([]);
            tableQuery.refetch();
          } catch (e) {
            throw new Error(apiErrorMessage(e, 'Bulk assign failed'));
          }
        }}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="userId" label="Assignee" rules={[{ required: true }]}>
            <Select options={staff.map((s) => ({ label: s.fullName, value: s.id }))} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Bulk close"
        open={bulkCloseOpen}
        onCancel={() => setBulkCloseOpen(false)}
        onOk={async () => {
          const v = await closeForm.validateFields();
          await httpClient.post('/support-tickets/bulk-close', {
            ids: selectedIds,
            comment: v.comment,
          });
          setBulkCloseOpen(false);
          setSelectedIds([]);
          tableQuery.refetch();
        }}
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item name="comment" label="Closing comment" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
