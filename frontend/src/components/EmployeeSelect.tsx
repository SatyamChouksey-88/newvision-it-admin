import { Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { httpClient } from '../providers/axios';

interface Opt {
  label: string;
  value: number;
}

interface EmployeeLite {
  id: number;
  firstName: string;
  lastName: string;
  employeeCode: string;
  isActive?: boolean;
}

const toOpt = (e: EmployeeLite): Opt => ({
  label: `${e.firstName} ${e.lastName} (${e.employeeCode})${e.isActive === false ? ' — inactive' : ''}`,
  value: e.id,
});

/**
 * Server-backed employee picker (searches by name / code / email).
 * Only active employees are offered — offboarded people must not receive assets or stock.
 */
export function EmployeeSelect({
  value,
  onChange,
  placeholder = 'Select employee',
  excludeId,
  disabled,
}: {
  value?: number;
  onChange?: (v: number | undefined) => void;
  placeholder?: string;
  /** Hide one employee (e.g. the person being offboarded) from the choices. */
  excludeId?: number;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const load = async (q?: string) => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const { data } = await httpClient.get('/employees', {
        params: { _start: 0, _end: 20, isActive: 'true', ...(q ? { q } : {}) },
      });
      if (mine !== seq.current) return; // a newer search has superseded this response
      setOptions((data.data ?? []).filter((e: EmployeeLite) => e.id !== excludeId).map(toOpt));
    } catch {
      if (mine === seq.current) setOptions([]);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  };
  const debouncedLoad = useDebouncedCallback((q: string) => void load(q), 250);

  // Reload the initial page when the exclusion changes (e.g. a different asset/employee opened).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `load` is intentionally unstable; keyed on excludeId
  useEffect(() => {
    void load();
  }, [excludeId]);

  // Make sure the currently selected employee is always labelled, even if they are not in
  // the current search page (e.g. value set programmatically or from a saved filter).
  useEffect(() => {
    if (!value || options.some((o) => o.value === value)) return;
    let cancelled = false;
    httpClient
      .get(`/employees/${value}`)
      .then(({ data }) => {
        if (!cancelled && data?.id) setOptions((prev) => [toOpt(data), ...prev]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value, options]);

  return (
    <Select
      showSearch
      allowClear
      filterOption={false}
      loading={loading}
      onSearch={debouncedLoad}
      value={value}
      onChange={(v) => onChange?.(v as number | undefined)}
      options={options}
      placeholder={placeholder}
      notFoundContent={loading ? 'Searching…' : 'No active employee matches'}
      disabled={disabled}
      style={{ width: '100%' }}
    />
  );
}

export function EmployeeMultiSelect({
  value,
  onChange,
  placeholder = 'Select employees',
  'aria-label': ariaLabel,
}: {
  value?: number[];
  onChange?: (v: number[]) => void;
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
      const { data } = await httpClient.get('/employees', {
        params: { _start: 0, _end: 20, isActive: 'true', ...(q ? { q } : {}) },
      });
      if (mine !== seq.current) return;
      setOptions((data.data ?? []).map(toOpt));
    } catch {
      if (mine === seq.current) setOptions([]);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  };
  const debouncedLoad = useDebouncedCallback((q: string) => void load(q), 250);
  // biome-ignore lint/correctness/useExhaustiveDependencies: load is stable enough for first page
  useEffect(() => {
    void load();
  }, []);
  return (
    <Select
      mode="multiple"
      showSearch
      filterOption={false}
      loading={loading}
      onSearch={debouncedLoad}
      value={value}
      onChange={(v) => onChange?.(v as number[])}
      options={options}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      style={{ width: '100%' }}
    />
  );
}
