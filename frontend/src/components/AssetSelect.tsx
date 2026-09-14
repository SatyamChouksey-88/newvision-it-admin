import { Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { httpClient } from '../providers/axios';

interface Opt {
  label: string;
  value: number;
}

/** Typeahead for “issued with asset” on accessory checkout. */
export function AssetSelect({
  value,
  onChange,
  placeholder = 'Optional parent asset',
  'aria-label': ariaLabel,
  status,
  categoryId,
}: {
  value?: number;
  onChange?: (v: number | undefined) => void;
  placeholder?: string;
  'aria-label'?: string;
  status?: string;
  categoryId?: number;
}) {
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const load = async (q?: string) => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const { data } = await httpClient.get('/assets', {
        params: {
          _start: 0,
          _end: 20,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
          ...(categoryId ? { categoryId } : {}),
        },
      });
      if (mine !== seq.current) return;
      setOptions(
        (data.data ?? []).map((a: { id: number; assetCode: string; brand?: string; model?: string }) => ({
          value: a.id,
          label: `${a.assetCode} — ${`${a.brand ?? ''} ${a.model ?? ''}`.trim()}`.trim(),
        })),
      );
    } catch {
      if (mine === seq.current) setOptions([]);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  };
  const debounced = useDebouncedCallback((q: string) => void load(q), 250);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when category/status filters change; load is stable enough for this picker.
  useEffect(() => {
    void load();
  }, [status, categoryId]);

  return (
    <Select
      showSearch
      allowClear
      filterOption={false}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      options={options}
      loading={loading}
      onSearch={(q) => debounced(q)}
      onChange={(v) => onChange?.(v)}
      style={{ width: '100%' }}
    />
  );
}
