import { Pie } from '@ant-design/plots';
import { STATUS_CHART_COLORS, STATUS_LABELS } from '../../chartColors';
import type { AssetStatus } from '../../types';

interface Props {
  byStatus: Partial<Record<AssetStatus, number>>;
  height?: number;
}

export function StatusDonutChart({ byStatus, height = 280 }: Props) {
  const data = (Object.entries(byStatus) as [AssetStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status],
      count,
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <Pie
      data={data}
      angleField="count"
      colorField="label"
      innerRadius={0.62}
      radius={0.9}
      height={height}
      legend={{ position: 'bottom', flipPage: false }}
      label={{
        text: (d: { label: string; count: number }) => `${d.count}`,
        style: { fontSize: 11 },
      }}
      scale={{
        color: {
          domain: data.map((d) => d.label),
          range: data.map((d) => STATUS_CHART_COLORS[d.status]),
        },
      }}
      tooltip={{
        title: (d: { label: string }) => d.label,
        items: [{ channel: 'y', name: 'Assets' }],
      }}
    />
  );
}
