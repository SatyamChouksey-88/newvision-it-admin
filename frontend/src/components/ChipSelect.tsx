import type { CSSProperties } from 'react';
import { Select } from 'antd';

/** Lightweight chip-style filter (mockup `Status: All ▾`) wrapping Ant Select. */
export function ChipSelect<T extends string | number>(props: {
  value?: T;
  onChange?: (v: T | undefined) => void;
  options: { label: string; value: T }[];
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
  'aria-label'?: string;
  style?: CSSProperties;
}) {
  return (
    <span className="nv-chip-select">
      {props.label ? <span className="nv-chip-select__label">{props.label}</span> : null}
      <Select
        size="small"
        variant="borderless"
        allowClear={props.allowClear}
        placeholder={props.placeholder}
        value={props.value}
        aria-label={props['aria-label']}
        onChange={(v) => props.onChange?.(v as T | undefined)}
        options={props.options}
        style={{ minWidth: 120, ...props.style }}
        popupMatchSelectWidth={false}
      />
    </span>
  );
}
