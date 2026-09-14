import { Alert, Typography } from 'antd';
import { Link } from 'react-router';

const COPY = (
  <>
    <Typography.Paragraph style={{ marginBottom: 8 }}>
      <strong>Does IT need to know which physical unit this is in six months?</strong>
    </Typography.Paragraph>
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      <li>
        <strong>Yes</strong> (serial, warranty claim, theft, AMC per box) → create a{' '}
        <Link to="/assets/create">serialized asset</Link> (MOU / HDS / KEY / CAM / DOCK).
      </li>
      <li>
        <strong>No</strong> (any spare from the drawer is fine) → stay on Accessory quantity.
      </li>
      <li>
        <strong>Used up</strong> (toner) → <Link to="/consumables">Consumable</Link>.
      </li>
    </ul>
  </>
);

export function InventoryDecision({ variant }: { variant: 'accessory' | 'asset' }) {
  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message={variant === 'asset' ? 'Serialized vs quantity stock' : 'Right drawer?'}
      description={COPY}
    />
  );
}
