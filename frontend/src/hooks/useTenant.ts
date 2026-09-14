import { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import type { Identity } from '../providers/authProvider';
import { httpClient } from '../providers/axios';

export type TenantSnapshot = {
  id: number;
  slug: string;
  name: string;
  logoUrl?: string | null;
  mailFromName?: string | null;
  mailFromAddress?: string | null;
  plan: 'starter' | 'team';
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trialEndsAt?: string | null;
  trialDaysRemaining?: number | null;
  trialDays?: number;
  modules: { procurement: boolean; chat: boolean; maintenance: boolean };
  seatCap?: number;
  itSeats?: number;
  onboarding?: {
    importEmployees?: boolean;
    importAssets?: boolean;
    assignedAsset?: boolean;
    scannedQr?: boolean;
    resolvedTicket?: boolean;
    skipped?: boolean;
  } | null;
  onboardingComplete?: boolean;
  activatedAt?: string | null;
};

export function useTenant() {
  const { data: identity } = useGetIdentity<Identity>();
  const [tenant, setTenant] = useState<TenantSnapshot | null>(identity?.tenant ?? null);
  const [loading, setLoading] = useState(!identity?.tenant);

  const reload = useCallback(async () => {
    try {
      const { data } = await httpClient.get('/tenant');
      setTenant(data);
    } catch {
      setTenant(identity?.tenant ?? null);
    } finally {
      setLoading(false);
    }
  }, [identity?.tenant]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tenant, loading, reload };
}
