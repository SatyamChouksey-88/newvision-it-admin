import { Card, Typography } from 'antd';
import type { MyKitAccessory } from '../types';
import { formatDate } from '../utils/format';

/** Employee Home / My kit card for an open accessory checkout — not a qty catalog row. */
export function MyKitAccessoryCard({ item }: { item: MyKitAccessory }) {
  return (
    <Card size="small" data-testid="my-kit-accessory">
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Accessory
      </Typography.Text>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{item.name}</div>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
        {item.category}
        {item.quantity > 1 ? ` · qty ${item.quantity}` : ''}
        {item.checkedOutAt ? ` · since ${formatDate(item.checkedOutAt)}` : ''}
        {item.expectedReturnAt ? ` · due ${formatDate(item.expectedReturnAt)}` : ''}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
        Return to IT
      </Typography.Text>
    </Card>
  );
}
