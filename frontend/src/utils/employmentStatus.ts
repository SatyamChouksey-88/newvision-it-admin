import type { Employee } from '../types';

export function employmentStatus(e?: Pick<Employee, 'isActive' | 'employmentType'> | null) {
  if (!e) return { label: '—', color: 'default' as const };
  const contract = e.employmentType === 'contract';
  if (contract && e.isActive === false) return { label: 'Contract Inactive', color: 'default' as const };
  if (contract) return { label: 'Contract Active', color: 'blue' as const };
  if (e.isActive === false) return { label: 'Inactive', color: 'default' as const };
  return { label: 'Active', color: 'success' as const };
}
