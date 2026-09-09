import { Select } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { httpClient } from '../providers/axios';

interface Opt {
  label: string;
  value: number;
}

/** Server-backed employee picker (searches by name / code / email). */
export function EmployeeSelect({
  value,
  onChange,
  placeholder = 'Select employee',
}: {
  value?: number;
  onChange?: (v: number) => void;
  placeholder?: string;
}) {
  const [options, setOptions] = useState<Opt[]>([]);

  const load = useCallback(async (q?: string) => {
    const { data } = await httpClient.get('/employees', {
      params: { _start: 0, _end: 20, ...(q ? { q } : {}) },
    });
    setOptions(
      (data.data ?? []).map((e: any) => ({
        label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        value: e.id,
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
