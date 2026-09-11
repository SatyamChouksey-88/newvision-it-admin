import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Popover, Space } from 'antd';
import { MaintenanceStatusTag } from './MaintenanceStatusTag';
import { TicketStatusTag } from './TicketStatusTag';
import { ASSET_STATUS_OPTIONS, StatusTag } from './StatusTag';
import type { AssetStatus, TicketStatus } from '../types';

const TICKET_STATUSES: TicketStatus[] = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'reopened',
];

export function StatusLegend({ kind = 'asset' }: { kind?: 'asset' | 'maintenance' | 'ticket' }) {
  const content =
    kind === 'maintenance' ? (
      <Space direction="vertical" size={4}>
        {(['reported', 'under_repair', 'repaired', 'reassigned', 'cancelled'] as const).map(
          (s) => (
            <MaintenanceStatusTag key={s} status={s} />
          ),
        )}
      </Space>
    ) : kind === 'ticket' ? (
      <Space direction="vertical" size={4}>
        {TICKET_STATUSES.map((s) => (
          <TicketStatusTag key={s} status={s} />
        ))}
      </Space>
    ) : (
      <Space direction="vertical" size={4}>
        {ASSET_STATUS_OPTIONS.map((o) => (
          <StatusTag key={o.value} status={o.value as AssetStatus} />
        ))}
      </Space>
    );

  return (
    <Popover title="Status legend" content={content} trigger="click">
      <Button
        type="text"
        size="small"
        icon={<QuestionCircleOutlined />}
        aria-label="Status legend"
      >
        Legend
      </Button>
    </Popover>
  );
}
