import { MailOutlined } from '@ant-design/icons';
import { Button, Modal, Tooltip } from 'antd';
import { useState, type MouseEvent } from 'react';
import { useToast } from './Toast';
import { ticketEmailDraft } from '../utils/ticketEmailDraft';

export function CopyEmailButton({
  ticket,
  compact,
}: {
  ticket: Parameters<typeof ticketEmailDraft>[0];
  compact?: boolean;
}) {
  const toast = useToast();
  const [fallback, setFallback] = useState<string | null>(null);

  const copy = async (e?: MouseEvent) => {
    e?.stopPropagation();
    const draft = ticketEmailDraft(ticket);
    try {
      await navigator.clipboard.writeText(draft.full);
      toast.success('Email copied — paste into your mailbox.');
    } catch {
      setFallback(draft.full);
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
