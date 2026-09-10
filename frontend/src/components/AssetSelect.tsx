import { Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { httpClient } from '../providers/axios';

interface Opt {
  label: string;
  value: number;
}

/** Server-backed asset picker (searches by code / serial / model). */
export function AssetSelect({
  value,
  onChange,
  placeholder = 'Select asset',
  'aria-label': ariaLabel,
}: {
  value?: number;
  onChange?: (v: number) => void;
  placeholder?: string;
  'aria-label'?: string;
}) {
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const load = async (q?: string) => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const { data } = await httpClient.get('/assets', {
        params: { _start: 0, _end: 20, ...(q ? { q } : {}) },
      });
      if (mine !== seq.current) return;
      setOptions(
        (data.data ?? []).map(
          (a: { id: number; assetCode: string; brand?: string; model?: string }) => ({
            label: `${a.assetCode} — ${a.brand ?? ''} ${a.model ?? ''}`.trim().replace(/—\s*$/, ''),
            value: a.id,
          }),
        ),
      );
    } catch {
      if (mine === seq.current) setOptions([]);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  };
  const debouncedLoad = useDebouncedCallback((q: string) => void load(q), 250);

  // Initial page only; searches go through `debouncedLoad`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    void load();
  }, []);

  return (
    <Select
      showSearch
      allowClear
      filterOption={false}
      loading={loading}
      onSearch={debouncedLoad}
      value={value}
      onChange={(v) => onChange?.(v as number)}
      options={options}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      notFoundContent={loading ? 'Searching…' : 'No matching asset'}
      style={{ width: '100%' }}
    />
  );
}
