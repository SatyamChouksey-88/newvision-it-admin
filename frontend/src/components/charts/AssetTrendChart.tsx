import { Line } from '@ant-design/plots';
import { CHART_PALETTE } from '../../chartColors';

export interface TrendPoint {
  month: string;
  label: string;
  count: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
  compact?: boolean;
}

export function AssetTrendChart({ data, height = 280, compact = false }: Props) {
  if (data.length === 0) return null;

  return (
    <Line
      data={data}
      xField="label"
      yField="count"
      height={height}
      smooth
      color={CHART_PALETTE[0]}
      point={{ size: compact ? 2 : 3, shape: 'circle' }}
      axis={{
        x: { title: false, label: compact ? false : undefined },
        y: { title: false, min: 0 },
      }}
      tooltip={{
        title: (d: { label: string }) => d.label,
        items: [{ channel: 'y', name: 'Assets added' }],
      }}
    />
  );
}
