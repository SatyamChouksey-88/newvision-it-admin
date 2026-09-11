import { MailOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Tooltip } from 'antd';
import { useState, type MouseEvent } from 'react';
import { useToast } from './Toast';
import { ticketEmailDraft } from '../utils/ticketEmailDraft';
import { apiErrorMessage, httpClient } from '../providers/axios';

export function CopyEmailButton({
  ticket,
  compact,
}: {
  ticket: Parameters<typeof ticketEmailDraft>[0] & { id?: number };
  compact?: boolean;
}) {
  const toast = useToast();
  const [fallback, setFallback] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [logging, setLogging] = useState(false);

  const copy = async (e?: MouseEvent) => {
    e?.stopPropagation();
    const next = ticketEmailDraft(ticket);
    try {
      await navigator.clipboard.writeText(next.full);
      toast.success('Email copied — paste into your mailbox.');
      if (ticket.id) {
        setDraft(next.full);
        setLogOpen(true);
      }
    } catch {
      setFallback(next.full);
    }
  };

  const logComment = async () => {
    if (!ticket.id) return;
    setLogging(true);
    try {
      await httpClient.post(`/support-tickets/${ticket.id}/comments`, {
        body: draft,
        isInternal: false,
      });
      toast.success('Logged as a public comment');
      setLogOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not log comment'));
    } finally {
      setLogging(false);
    }
  };

  return (
    <>
      <Tooltip title="Copy a ready email draft for Outlook / Gmail">
        <Button
          size="small"
          icon={<MailOutlined />}
          aria-label="Copy email draft"
          onClick={(e) => void copy(e)}
        >
          {compact ? null : 'Copy email'}
        </Button>
      </Tooltip>
      <Modal
        open={logOpen}
        title="Also log as a public comment?"
        onCancel={() => setLogOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setLogOpen(false)}>Just copied</Button>
            <Button type="primary" loading={logging} onClick={() => void logComment()}>
              Log as public comment
            </Button>
          </Space>
        }
      >
        <p style={{ marginTop: 0 }}>
          The draft is on your clipboard. Optionally add the same text to the ticket so mailbox and
          NewVision stay in sync.
        </p>
      </Modal>
      <Modal
        open={!!fallback}
        title="Email draft"
        onCancel={() => setFallback(null)}
        footer={
          <Button
            type="primary"
            onClick={() => {
              if (fallback) void navigator.clipboard.writeText(fallback);
              setFallback(null);
              toast.success('Email copied — paste into your mailbox.');
            }}
          >
            Copy again
          </Button>
        }
      >
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{fallback}</pre>
      </Modal>
    </>
  );
}
