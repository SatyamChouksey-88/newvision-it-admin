import { Select } from 'antd';
import { useCallback, useEffect, useState } from 'react';
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
}: {
  value?: number;
  onChange?: (v: number) => void;
  placeholder?: string;
}) {
  const [options, setOptions] = useState<Opt[]>([]);

  const load = useCallback(async (q?: string) => {
    const { data } = await httpClient.get('/assets', {
      params: { _start: 0, _end: 20, ...(q ? { q } : {}) },
    });
    setOptions(
      (data.data ?? []).map((a: any) => ({
        label: `${a.assetCode} — ${a.brand ?? ''} ${a.model ?? ''}`.trim(),
        value: a.id,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Select
      showSearch
      filterOption={false}
      onSearch={load}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      style={{ width: '100%' }}
    />
  );
}
