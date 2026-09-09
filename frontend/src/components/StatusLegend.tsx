import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover, Space } from 'antd';
import { MaintenanceStatusTag } from './MaintenanceStatusTag';
import { ASSET_STATUS_OPTIONS, StatusTag } from './StatusTag';
import type { AssetStatus } from '../types';

export function StatusLegend({ kind = 'asset' }: { kind?: 'asset' | 'maintenance' }) {
  const content =
    kind === 'maintenance' ? (
      <Space direction="vertical" size={4}>
        {(['reported', 'under_repair', 'repaired', 'reassigned', 'cancelled'] as const).map(
          (s) => (
            <MaintenanceStatusTag key={s} status={s} />
          ),
        )}
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
      <QuestionCircleOutlined style={{ color: '#595959', cursor: 'pointer' }} aria-label="Status legend" />
    </Popover>
  );
}
