import { Alert, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { httpClient } from '../providers/axios';
import { ENTRA_MFA_HANDOFF_KEY, entraErrorMessage } from '../providers/entra';
import { finishSession } from '../providers/session';

/**
 * Phase 2 — lands here after a successful (or MFA-pending) Microsoft sign-in. The backend
 * redirect never carries the real access token — only a single-use opaque handoff code — which
 * this page exchanges immediately. A completed login finishes the same way password login
 * does; an MFA challenge is handed to the login page's existing MFA UI rather than duplicated
 * here.
 */
export function EntraCompletePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handoff = new URLSearchParams(window.location.search).get('handoff');
    if (!handoff) {
      window.location.assign('/login?entraError=missing_state');
      return;
    }
    (async () => {
      try {
        const { data } = await httpClient.post('/auth/entra/exchange', { handoff });
        if (data.access_token) {
          finishSession(data);
          return;
        }
        if (data.mfaRequired || data.mfaEnrollRequired || data.mfaSetupRequired) {
          sessionStorage.setItem(ENTRA_MFA_HANDOFF_KEY, JSON.stringify(data));
          window.location.assign('/login?entraMfa=1');
          return;
        }
        setError('verification_failed');
      } catch (e) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setError(status === 400 ? 'expired_or_replayed' : 'verification_failed');
      }
    })();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
      {error ? (
        <>
          <Alert type="error" showIcon message="Sign-in failed" description={entraErrorMessage(error)} style={{ maxWidth: 420 }} />
          <Typography.Link href="/login">Back to sign in</Typography.Link>
        </>
      ) : (
        <>
          <Spin size="large" />
          <Typography.Text type="secondary">Completing Microsoft sign-in…</Typography.Text>
        </>
      )}
    </div>
  );
}
