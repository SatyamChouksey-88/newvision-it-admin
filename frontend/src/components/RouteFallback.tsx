import { Card, Skeleton } from 'antd';

/** Shown while a lazy route chunk is fetching. */
export function RouteFallback() {
  return (
    <Card size="small" bordered={false} data-testid="route-fallback" style={{ margin: 8 }}>
      <Skeleton active title paragraph={{ rows: 8 }} />
    </Card>
  );
}
