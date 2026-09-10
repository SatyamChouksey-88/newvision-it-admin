import { Space, Tag, Typography } from 'antd';
import { formatDate } from '../utils/format';

export interface TimelineEvent {
  id: string | number;
  at: string;
  summary: string;
  actor?: string;
  manual?: boolean;
  backfilled?: boolean;
  color?: string;
}

const DOT: Record<string, string> = {
  create: '#1677FF',
  update: '#64748B',
  assign: '#0958D9',
  status_change: '#D97706',
  comment: '#16A34A',
  manual_override: '#DC2626',
};

export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <Typography.Text type="secondary">No history yet.</Typography.Text>;
  }
  return (
    <ol className="nv-event-timeline" data-testid="event-timeline" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((e) => (
        <li key={e.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              marginTop: 6,
              flex: '0 0 10px',
              background: e.color ?? DOT.create,
            }}
          />
          <div>
            <Space size={6} wrap>
              <Typography.Text style={{ fontSize: 13 }}>{e.summary}</Typography.Text>
              {e.manual ? (
                <Tag color="red" data-testid="manual-tag">
                  Manual
                </Tag>
              ) : null}
              {e.backfilled ? (
                <Tag color="gold" data-testid="backfilled-tag">
                  Backfilled
                </Tag>
              ) : null}
            </Space>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(e.at)}
                {e.actor ? ` · ${e.actor}` : ''}
              </Typography.Text>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
