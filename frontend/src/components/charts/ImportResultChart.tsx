import { Column, Pie } from '@ant-design/plots';
import {
  categorizeImportErrors,
  CHART_PALETTE,
  IMPORT_OUTCOME_COLORS,
} from '../../chartColors';
import type { ImportJob } from '../../types';

interface Props {
  job: Pick<
    ImportJob,
    'createdCount' | 'updatedCount' | 'failedCount' | 'duplicateCount' | 'totalRows' | 'errors'
  >;
}

export function ImportResultChart({ job }: Props) {
  const updated = job.updatedCount ?? 0;
  const duplicates = job.duplicateCount ?? 0;
  const processed = job.createdCount + updated + job.failedCount;
  const skipped = Math.max(0, job.totalRows - processed - duplicates);

  const outcomeData = [
    { type: 'Created', count: job.createdCount, color: IMPORT_OUTCOME_COLORS.created },
    { type: 'Updated', count: updated, color: IMPORT_OUTCOME_COLORS.updated },
    { type: 'Failed', count: job.failedCount, color: IMPORT_OUTCOME_COLORS.failed },
    ...(duplicates > 0
      ? [{ type: 'Duplicates', count: duplicates, color: IMPORT_OUTCOME_COLORS.duplicates }]
      : []),
    ...(skipped > 0
      ? [{ type: 'Skipped', count: skipped, color: IMPORT_OUTCOME_COLORS.skipped }]
      : []),
  ].filter((d) => d.count > 0);

  const errorData = job.errors?.length ? categorizeImportErrors(job.errors) : [];

  if (outcomeData.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 220px', minWidth: 200 }}>
        <Pie
          data={outcomeData}
          angleField="count"
          colorField="type"
          innerRadius={0.55}
          height={220}
          legend={{ position: 'bottom' }}
          label={{ text: (d: { type: string; count: number }) => `${d.count}`, style: { fontSize: 11 } }}
          scale={{
            color: {
              domain: outcomeData.map((d) => d.type),
              range: outcomeData.map((d) => d.color),
            },
          }}
        />
      </div>
      {errorData.length > 0 && (
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <Column
            data={errorData}
            xField="category"
            yField="count"
            height={220}
            color={CHART_PALETTE[3]}
            columnStyle={{ radius: [4, 4, 0, 0] }}
            axis={{ x: { title: false }, y: { title: false, min: 0 } }}
            label={{
              text: (d: { count: number }) => String(d.count),
              style: { fontSize: 11 },
              position: 'top',
            }}
          />
        </div>
      )}
    </div>
  );
}
