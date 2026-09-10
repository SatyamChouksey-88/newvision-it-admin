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
  const series = (Array.isArray(data) ? data : []).map((d) => ({
    ...d,
    count: Number(d.count) || 0,
  }));
  if (series.length === 0) return null;

  const peak = Math.max(1, ...series.map((d) => d.count));

  return (
    <div data-testid="growth-chart" className="nv-trend-chart">
      <Line
        data={series}
        encode={{ x: 'label', y: 'count' }}
        height={height}
        style={{ lineWidth: compact ? 1.5 : 2 }}
        color={CHART_PALETTE[0]}
        scale={{
          y: { domainMin: 0, domainMax: peak, nice: true, type: 'linear' },
        }}
        axis={{
          x: { title: false, label: compact ? false : undefined },
          y: { title: false },
        }}
        tooltip={{
          title: (d: { label: string }) => d.label,
          items: [{ channel: 'y', name: 'Assets added' }],
        }}
      />
    </div>
  );
}
