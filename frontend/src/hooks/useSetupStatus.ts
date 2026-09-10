import { useCustom } from '@refinedev/core';
import type { SetupStatus } from '../types';

/** Cached estate emptiness check — true only on a migrate-only database with no seed. */
export function useSetupStatus() {
  const { query } = useCustom<SetupStatus>({
    url: 'dashboard/setup',
    method: 'get',
    queryOptions: { queryKey: ['dashboard-setup'], staleTime: 0 },
  });
  return {
    setup: query.data?.data,
    freshInstall: query.data?.data?.freshInstall === true,
    isLoading: query.isLoading,
  };
}
