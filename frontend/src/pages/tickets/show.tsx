import { useGetIdentity, useShow } from '@refinedev/core';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Rate,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ContactCard } from '../../components/ContactCard';
import { CopyButton } from '../../components/CopyButton';
import { EmptyState } from '../../components/EmptyState';
import { EmployeeSelect } from '../../components/EmployeeSelect';
import { EventTimeline, type TimelineEvent } from '../../components/EventTimeline';
import { ManualEditButton } from '../../components/ManualEdit';
import { RecordNotes } from '../../components/RecordNotes';
import {
  TicketPriorityTag,
  TicketStatusSelect,
  TicketStatusTag,
} from '../../components/TicketStatusTag';
import { useToast } from '../../components/Toast';
import type { Identity } from '../../providers/authProvider';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { CannedResponse, SupportTicket, TicketComment, TicketStatus } from '../../types';
import { formatDate } from '../../utils/format';

const STAFF = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_SUPPORT'];
const MANUAL = ['SUPER_ADMIN', 'IT_ADMIN'];

export function TicketShow() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: identity } = useGetIdentity<Identity>();
  const isStaff = STAFF.includes(identity?.role ?? '');
  const canManual = MANUAL.includes(identity?.role ?? '');
  const { query } = useShow<SupportTicket>({ resource: 'support-tickets' });
  const ticket = query.data?.data;
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [staff, setStaff] = useState<{ id: number; fullName: string }[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [commentForm] = Form.useForm();
  const [timeForm] = Form.useForm();
  const [dupForm] = Form.useForm();
  const [rateForm] = Form.useForm();

  const reload = () => void query.refetch();

  useEffect(() => {
    if (isStaff) {
      httpClient.get('/canned-responses').then(({ data }) => setCanned(Array.isArray(data) ? data : [])).catch(() => undefined);
      httpClient.get('/support-tickets/staff').then(({ data }) => setStaff(Array.isArray(data) ? data : [])).catch(() => undefined);
    }
  }, [isStaff]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch history when the ticket changes
  useEffect(() => {
    if (!ticket?.id) return;
    httpClient
      .get(`/support-tickets/${ticket.id}/timeline`)
      .then(({ data }) =>
        setTimeline(
          (Array.isArray(data) ? data : []).map((e: { id: number; at: string; summary: string; actor: string; action: string; manual?: boolean }) => ({
            id: e.id,
            at: e.at,
            summary: e.summary,
            actor: e.actor,
            manual: e.manual || e.action === 'manual_override',
            backfilled: Boolean((e as { backfilled?: boolean }).backfilled),
            color: e.action === 'manual_override' ? '#DC2626' : undefined,
          })),
        ),
      )
      .catch(() => setTimeline([]));
  }, [ticket?.id, ticket?.updatedAt]);

  const isRequester = ticket && identity?.employeeId === ticket.raisedById;
  const canRate =
    isRequester &&
    (ticket?.status === 'resolved' || ticket?.status === 'closed') &&
    !ticket?.ratedAt &&
    !ticket?.ratingPromptDropped;

  const transition = async (status: TicketStatus) => {
    if (!ticket) return;
    try {
      await httpClient.patch(`/support-tickets/${ticket.id}/transition`, { status });
      toast.success(`Status → ${status.replaceAll('_', ' ')}`);
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change status'));
    }
  };

  const sendComment = async (values: { body: string; isInternal?: boolean }) => {
    if (!ticket) return;
    try {
      await httpClient.post(`/support-tickets/${ticket.id}/comments`, values);
      commentForm.resetFields();
      toast.success(values.isInternal ? 'Internal note added' : 'Reply sent');
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not comment'));
    }
  };

  if (!ticket && query.isLoading) return <Card loading />;
  if (query.isError || !ticket) {
    return (
      <EmptyState
        description="This ticket could not be loaded."
        actionLabel="Back to tickets"
        onAction={() => navigate('/tickets')}
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <span data-testid="ticket-number">{ticket?.ticketNumber}</span>
            {ticket?.ticketNumber ? <CopyButton value={ticket.ticketNumber} label="ticket number" /> : null}
            {ticket?.overdue ? <Tag color="red">Overdue</Tag> : null}
            {ticket?.duplicateOf ? (
              <Tag>
                Duplicate of{' '}
                <Link to={`/tickets/show/${ticket.duplicateOf.id}`}>{ticket.duplicateOf.ticketNumber}</Link>
              </Tag>
            ) : null}
          </Space>
        }
        extra={
          <Space>
            {isStaff && ticket ? (
              <TicketStatusSelect value={ticket.status} onChange={(s) => void transition(s)} />
            ) : ticket ? (
              <TicketStatusTag status={ticket.status} />
            ) : null}
            {canManual && ticket ? (
              <ManualEditButton
                entityType="SupportTicket"
                id={ticket.id}
                fields={[
                  { name: 'subject', label: 'Subject', value: ticket.subject },
                  { name: 'status', label: 'Status', value: ticket.status },
                  { name: 'priority', label: 'Priority', value: ticket.priority },
                  { name: 'createdAt', label: 'Created at', value: ticket.createdAt },
                ]}
                onSaved={reload}
              />
            ) : null}
          </Space>
        }
      >
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Subject" span={2}>
            {ticket?.subject}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{ticket?.description}</div>
          </Descriptions.Item>
          <Descriptions.Item label="Category">{ticket?.category?.name}</Descriptions.Item>
          <Descriptions.Item label="Priority">
            {ticket ? <TicketPriorityTag priority={ticket.priority} /> : null}
          </Descriptions.Item>
          <Descriptions.Item label="Requester">
            {ticket?.raisedBy ? (
              <ContactCard
                name={`${ticket.raisedBy.firstName} ${ticket.raisedBy.lastName}`}
                employee={ticket.raisedBy}
              />
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Assignee">
            {isStaff ? (
              <Select
                allowClear
                placeholder="Unassigned"
                aria-label="Assignee"
                style={{ minWidth: 200 }}
                value={ticket?.assignedToId ?? undefined}
                options={staff.map((s) => ({ label: s.fullName, value: s.id }))}
                onChange={async (userId) => {
                  if (!ticket) return;
                  await httpClient.post(`/support-tickets/${ticket.id}/assign`, { userId: userId ?? null });
                  reload();
                }}
              />
            ) : ticket?.assignedTo ? (
              <ContactCard name={ticket.assignedTo.fullName} email={ticket.assignedTo.email} employee={ticket.assignedTo.employee} />
            ) : (
              'Unassigned'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Linked asset">
            {ticket?.asset ? <Link to={`/assets/show/${ticket.asset.id}`}>{ticket.asset.assetCode}</Link> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Due">{ticket?.dueDate ? formatDate(ticket.dueDate) : '—'}</Descriptions.Item>
          <Descriptions.Item label="Time spent">{ticket?.totalTimeSpentMinutes ?? 0} min</Descriptions.Item>
          <Descriptions.Item label="Satisfaction">
            {ticket?.satisfactionRating ? `${ticket.satisfactionRating} / 5` : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {canRate ? (
        <Card title="How did we do?" data-testid="csat-card">
          <Form
            form={rateForm}
            layout="vertical"
            onFinish={async (v) => {
              try {
                await httpClient.post(`/support-tickets/${ticket!.id}/rate`, {
                  rating: v.rating,
                  comment: v.comment,
                });
                toast.success('Thanks for the rating');
                reload();
              } catch (e) {
                toast.error(apiErrorMessage(e, 'Could not submit rating'));
              }
            }}
          >
            <Form.Item name="rating" rules={[{ required: true }]} label="Rating">
              <Rate />
            </Form.Item>
            <Form.Item name="comment" label="Comment (optional)">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Button type="primary" htmlType="submit" data-testid="submit-rating">
              Submit rating
            </Button>
          </Form>
        </Card>
      ) : null}

      <Card title="Conversation">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {(ticket?.comments ?? []).length === 0 ? (
            <Typography.Text type="secondary">No comments yet. Add a public reply or an internal note.</Typography.Text>
          ) : null}
          {(ticket?.comments ?? []).map((c: TicketComment) => (
            <div
              key={c.id}
              data-testid={c.isInternal ? 'internal-note' : 'public-comment'}
              style={{
                padding: 12,
                background: c.isInternal ? '#fffbeb' : '#f8fafc',
                borderRadius: 8,
              }}
            >
              <Space>
                <Typography.Text strong>{c.author?.fullName}</Typography.Text>
                {c.isInternal ? <Tag>Internal</Tag> : <Tag color="blue">Public</Tag>}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDate(c.createdAt)}
                </Typography.Text>
              </Space>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{c.body}</div>
            </div>
          ))}
          <Form form={commentForm} layout="vertical" onFinish={(v) => void sendComment(v)}>
            {isStaff && canned.length > 0 ? (
              <Form.Item label="Quick reply">
                <Select
                  allowClear
                  placeholder="Insert a canned response"
                  aria-label="Canned response"
                  options={canned.map((c) => ({ label: c.title, value: c.id }))}
                  onChange={(id) => {
                    const row = canned.find((c) => c.id === id);
                    if (row) commentForm.setFieldValue('body', row.body);
                  }}
                />
              </Form.Item>
            ) : null}
            <Form.Item name="body" rules={[{ required: true }]}>
              <Input.TextArea rows={3} aria-label="Comment" />
            </Form.Item>
            {isStaff ? (
              <Form.Item name="isInternal" valuePropName="checked">
                <Checkbox>Internal note (not visible to the requester)</Checkbox>
              </Form.Item>
            ) : null}
            <Button type="primary" htmlType="submit">
              Send
            </Button>
          </Form>
        </Space>
      </Card>

      <Card title="Watchers">
        {(ticket?.watchers ?? []).length === 0 ? (
          <Typography.Text type="secondary">No watchers yet.</Typography.Text>
        ) : null}
        <Space wrap>
          {(ticket?.watchers ?? []).map((w) => (
            <Tag
              key={w.id}
              closable={isStaff}
              onClose={async (e) => {
                e.preventDefault();
                await httpClient.delete(`/support-tickets/${ticket!.id}/watchers/${w.employeeId}`);
                reload();
              }}
            >
              {w.employee.firstName} {w.employee.lastName}
            </Tag>
          ))}
        </Space>
        <div style={{ marginTop: 12, maxWidth: 320 }}>
          <EmployeeSelect
            placeholder="Add watcher"
            onChange={async (id) => {
              if (!ticket || id == null) return;
              await httpClient.post(`/support-tickets/${ticket.id}/watchers`, { employeeId: id });
              reload();
            }}
          />
        </div>
      </Card>

      <Card title="Attachments">
        <Space direction="vertical">
          {(ticket?.attachments ?? []).length === 0 ? (
            <Typography.Text type="secondary">No attachments yet.</Typography.Text>
          ) : null}
          {(ticket?.attachments ?? []).map((a) => (
            <Button
              key={a.id}
              type="link"
              href={`${httpClient.defaults.baseURL}/support-tickets/${ticket!.id}/attachments/${a.id}`}
              onClick={async (e) => {
                e.preventDefault();
                const res = await httpClient.get(`/support-tickets/${ticket!.id}/attachments/${a.id}`, {
                  responseType: 'blob',
                });
                const url = URL.createObjectURL(res.data);
                const link = document.createElement('a');
                link.href = url;
                link.download = a.filename;
                link.click();
              }}
            >
              {a.filename}
            </Button>
          ))}
          <Upload
            beforeUpload={async (f) => {
              const fd = new FormData();
              fd.append('file', f);
              await httpClient.post(`/support-tickets/${ticket!.id}/attachments`, fd);
              reload();
              return false;
            }}
          >
            <Button size="small">Attach file</Button>
          </Upload>
        </Space>
      </Card>

      {isStaff ? (
        <Card title="Time log">
          {(ticket?.timeLogs ?? []).length === 0 ? (
            <Typography.Text type="secondary">No time logged yet.</Typography.Text>
          ) : null}
          {(ticket?.timeLogs ?? []).map((t) => (
            <div key={t.id}>
              {t.minutes} min — {t.staff.fullName}
              {t.note ? ` · ${t.note}` : ''}
            </div>
          ))}
          <Form
            form={timeForm}
            layout="inline"
            style={{ marginTop: 12 }}
            onFinish={async (v) => {
              await httpClient.post(`/support-tickets/${ticket!.id}/time`, v);
              timeForm.resetFields();
              reload();
            }}
          >
            <Form.Item name="minutes" rules={[{ required: true }]}>
              <InputNumber min={1} max={1440} placeholder="Minutes" aria-label="Minutes spent" />
            </Form.Item>
            <Form.Item name="note">
              <Input placeholder="Note" />
            </Form.Item>
            <Button htmlType="submit">Log time</Button>
          </Form>
        </Card>
      ) : null}

      {isStaff && ticket && ticket.status !== 'closed' ? (
        <Card title="Mark as duplicate" size="small">
          <Form
            form={dupForm}
            layout="inline"
            onFinish={async (v) => {
              try {
                await httpClient.post(`/support-tickets/${ticket.id}/duplicate`, {
                  originalTicketNumber: v.originalTicketNumber,
                });
                toast.success('Marked as duplicate');
                reload();
              } catch (e) {
                toast.error(apiErrorMessage(e, 'Could not mark duplicate'));
              }
            }}
          >
            <Form.Item name="originalTicketNumber" rules={[{ required: true }]}>
              <Input placeholder="TCK-000123" aria-label="Original ticket number" />
            </Form.Item>
            <Button htmlType="submit" data-testid="mark-duplicate">
              Close as duplicate
            </Button>
          </Form>
        </Card>
      ) : null}

      <Card title="History">
        <EventTimeline events={timeline} />
      </Card>

      <RecordNotes entityType="SupportTicket" entityId={ticket?.id} canAdd={Boolean(isStaff)} />
    </Space>
  );
}
