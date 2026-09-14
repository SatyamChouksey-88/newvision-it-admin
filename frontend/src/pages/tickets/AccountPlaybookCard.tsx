import { Alert, Button, Card, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { SupportTicket, TicketTemplate } from '../../types';
import { formatDate } from '../../utils/format';

type IdpSystem = 'm365' | 'vpn' | 'biometric' | 'other';

export function AccountPlaybookCard({
  ticket,
  templates,
  onChanged,
}: {
  ticket: SupportTicket;
  templates: TicketTemplate[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const { confirmAction } = useConfirmAction();
  const [busy, setBusy] = useState(false);
  const login = ticket.raisedBy?.user;
  const verified = Boolean(ticket.identityVerifiedAt);
  const manager = ticket.raisedBy?.manager;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not complete that action'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Account / MFA playbook" size="small" data-testid="account-playbook">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Typography.Text>
          Requester {ticket.raisedBy?.employeeCode}
          {manager
            ? ` · manager ${manager.firstName} ${manager.lastName} (${manager.employeeCode})`
            : ' · no manager on file'}
          {login ? ` · NewVision login ${login.email}` : ' · no NewVision login'}
        </Typography.Text>
        {verified ? (
          <Tag color="green" data-testid="identity-verified">
            Identity verified {formatDate(ticket.identityVerifiedAt)}
            {ticket.verifiedBy ? ` by ${ticket.verifiedBy.fullName}` : ''}
          </Tag>
        ) : (
          <Alert
            type="warning"
            showIcon
            message="Do not reset until identity is verified (employee code + manager or photo ID)."
          />
        )}
        <Space wrap>
          <Select
            placeholder="Apply a template"
            aria-label="Apply ticket template"
            style={{ minWidth: 260 }}
            options={templates.map((t) => ({ label: t.title, value: t.id }))}
            onChange={(templateId: number) => {
              void confirmAction({
                title: 'Apply this template?',
                content:
                  'Subject, description, category, and priority will be replaced with the template (including the identity checklist).',
                okText: 'Apply template',
                onOk: () =>
                  run(
                    () => httpClient.post(`/support-tickets/${ticket.id}/apply-template`, { templateId }),
                    'Template applied',
                  ),
              });
            }}
          />
          {!verified ? (
            <Button
              data-testid="verify-identity"
              disabled={busy}
              onClick={() =>
                void confirmAction({
                  title: 'Mark identity verified?',
                  content: `Confirm you checked ${ticket.raisedBy?.employeeCode} against a manager or photo ID.`,
                  okText: 'Identity verified',
                  onOk: () =>
                    run(
                      () => httpClient.post(`/support-tickets/${ticket.id}/verify-identity`),
                      'Identity verified',
                    ),
                })
              }
            >
              Verify identity
            </Button>
          ) : null}
          {login?.isActive ? (
            <Button
              data-testid="send-nv-reset"
              disabled={busy || !verified}
              onClick={() =>
                void confirmAction({
                  title: 'Send NewVision reset link?',
                  content: `Emails a one-hour set-password link to ${login.email}. This does not reset M365, VPN, or biometric.`,
                  okText: 'Send reset link',
                  onOk: () =>
                    run(
                      () => httpClient.post(`/support-tickets/${ticket.id}/send-reset-link`),
                      'Reset link sent',
                    ),
                })
              }
            >
              Send NewVision reset link
            </Button>
          ) : null}
          <Select
            placeholder="Record IdP reset"
            aria-label="Record IdP reset"
            style={{ minWidth: 220 }}
            disabled={busy || !verified}
            options={[
              { value: 'm365', label: 'Reset done in M365 / Entra' },
              { value: 'vpn', label: 'Reset done on VPN' },
              { value: 'biometric', label: 'Reset done on biometric' },
              { value: 'other', label: 'Reset done in another system' },
            ]}
            onChange={(system: IdpSystem) => {
              void run(
                () => httpClient.post(`/support-tickets/${ticket.id}/record-idp-reset`, { system }),
                'IdP reset recorded',
              );
            }}
          />
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Then send the canned reply “Reset completed — verify & close” to resolve the ticket.
        </Typography.Text>
      </Space>
    </Card>
  );
}
