import { Column } from '@ant-design/plots';
import { CHART_PALETTE } from '../../chartColors';

export interface LocationBreakdown {
  locationId: number;
  code: string;
  name: string;
  total: number;
}

interface Props {
  data: LocationBreakdown[];
  height?: number;
}

export function LocationBarChart({ data, height = 280 }: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    location: d.code,
    total: d.total,
  }));

  return (
    <Column
      data={chartData}
      xField="location"
      yField="total"
      height={height}
      color={CHART_PALETTE[0]}
      columnStyle={{ radius: [4, 4, 0, 0] }}
      axis={{ y: { title: false }, x: { title: false } }}
      label={{
        text: (d: { total: number }) => (d.total > 0 ? String(d.total) : ''),
        style: { fontSize: 11, fill: '#595959' },
        position: 'top',
      }}
      tooltip={{ title: (d: { location: string }) => d.location }}
    />
  );
}
