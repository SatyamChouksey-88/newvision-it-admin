import { Column } from '@ant-design/plots';
import { STATUS_CHART_COLORS, STATUS_LABELS } from '../../chartColors';
import type { AssetStatus, LocationBreakdown } from '../../types';

interface Props {
  data: LocationBreakdown[];
  height?: number;
}

export function LocationBarChart({ data, height = 280 }: Props) {
  if (data.length === 0) return null;

  const stacked = data.some((d) => d.byStatus && Object.keys(d.byStatus).length > 0);
  const chartData = stacked
    ? data.flatMap((d) =>
        (Object.entries(d.byStatus ?? {}) as [AssetStatus, number][])
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            location: d.code,
            status: STATUS_LABELS[status] ?? status,
            count,
            color: STATUS_CHART_COLORS[status],
          })),
      )
    : data.map((d) => ({ location: d.code, status: 'Assets', count: d.total, color: '#1677FF' }));

  const domain = [...new Set(chartData.map((d) => d.status))];
  const range = domain.map(
    (label) => chartData.find((d) => d.status === label)?.color ?? '#64748B',
  );

  return (
    <Column
      data={chartData}
      xField="location"
      yField="count"
      colorField="status"
      stack
      height={height}
      legend={{ position: 'bottom', flipPage: false }}
      axis={{ y: { title: false }, x: { title: false } }}
      scale={{
        color: { domain, range },
      }}
      tooltip={{
        title: (d: { location: string }) => d.location,
        items: [{ channel: 'y', name: 'Assets' }],
      }}
    />
  );
}
