import { Button, Empty } from 'antd';

export function EmptyState({
  description,
  actionLabel,
  onAction,
}: {
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={description}
      style={{ padding: '32px 0' }}
    >
      {actionLabel && onAction ? (
        <Button type="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Empty>
  );
}
