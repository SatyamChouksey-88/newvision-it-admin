import { Line } from '@ant-design/plots';
import { CHART_PALETTE } from '../../chartColors';

export interface TrendPoint {
  month: string;
  label: string;
  count: number;
  added?: number;
  total?: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
  compact?: boolean;
}

export function AssetTrendChart({ data, height = 280, compact = false }: Props) {
  const series = (Array.isArray(data) ? data : []).map((d) => {
    const total = Number(d.total ?? d.count) || 0;
    const added = Number(d.added ?? 0) || 0;
    return { ...d, total, added };
  });
  if (series.length === 0) return null;

  const long = series.flatMap((d) => [
    { label: d.label, value: d.total, series: 'Total assets' },
    { label: d.label, value: d.added, series: 'Added this month' },
  ]);
  const peak = Math.max(1, ...series.map((d) => d.total));

  return (
    <div data-testid="growth-chart" className="nv-trend-chart">
      <Line
        data={long}
        encode={{ x: 'label', y: 'value', color: 'series' }}
        height={height}
        style={{ lineWidth: compact ? 1.5 : 2 }}
        scale={{
          y: { domainMin: 0, domainMax: peak, nice: true, type: 'linear' },
          color: { range: [CHART_PALETTE[0], CHART_PALETTE[2]] },
        }}
        legend={compact ? false : { position: 'bottom' }}
        axis={{
          x: { title: false, label: compact ? false : undefined },
          y: { title: false },
        }}
        tooltip={{
          title: (d: { label: string }) => d.label,
        }}
      />
    </div>
  );
}
