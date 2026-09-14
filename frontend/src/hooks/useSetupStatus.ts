import { useCustom, useGetIdentity } from '@refinedev/core';
import type { SetupStatus } from '../types';
import type { Identity } from '../providers/authProvider';

/** Cached estate emptiness check — true only on a migrate-only database with no seed. */
export function useSetupStatus() {
  const { data: identity } = useGetIdentity<Identity>();
  const allowed = identity?.role === 'SUPER_ADMIN' || identity?.role === 'IT_ADMIN';
  const { query } = useCustom<SetupStatus>({
    url: 'dashboard/setup',
    method: 'get',
    queryOptions: {
      queryKey: ['dashboard-setup'],
      staleTime: 0,
      enabled: allowed,
      retry: false,
    },
  });
  return {
    setup: query.data?.data,
    freshInstall: query.data?.data?.freshInstall === true,
    seedOnStart: query.data?.data?.seedOnStart === true,
    seedWipeRisk: query.data?.data?.seedWipeRisk === true,
    mailFailing: query.data?.data?.mailFailing === true,
    isLoading: query.isLoading,
  };
}
