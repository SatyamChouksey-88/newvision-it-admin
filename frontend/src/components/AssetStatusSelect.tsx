import { Select } from 'antd';
import type { AssetStatus } from '../types';
import { ASSET_STATUS_OPTIONS, StatusTag } from './StatusTag';

/** Allowed next statuses — keep in sync with backend `lifecycle.ts`. */
export const ASSET_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  available: ['assigned', 'pending_assignment', 'under_repair', 'retired'],
  pending_assignment: ['assigned', 'available'],
  assigned: ['available', 'under_repair', 'lost', 'damaged', 'retired'],
  under_repair: ['assigned', 'available', 'lost', 'damaged', 'retired'],
  lost: ['available', 'retired'],
  damaged: ['under_repair', 'available', 'retired'],
  retired: ['disposed'],
  disposed: [],
};

export function AssetStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: AssetStatus;
  onChange: (next: AssetStatus) => void;
  disabled?: boolean;
}) {
  const allowed = new Set<AssetStatus>([value, ...(ASSET_TRANSITIONS[value] ?? [])]);
  return (
    <Select<AssetStatus>
      size="small"
      value={value}
      disabled={disabled || allowed.size <= 1}
      aria-label="Change asset status"
      style={{ minWidth: 160 }}
      onClick={(e) => e.stopPropagation()}
      onChange={(next) => {
        if (next !== value) onChange(next);
      }}
      optionLabelProp="label"
      options={ASSET_STATUS_OPTIONS.filter((o) => allowed.has(o.value)).map((o) => ({
        value: o.value,
        label: o.label,
      }))}
      optionRender={(opt) => <StatusTag status={opt.value as AssetStatus} />}
    />
  );
}
