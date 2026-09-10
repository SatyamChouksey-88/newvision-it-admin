import { Button, Descriptions, Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { useToast } from './Toast';

export function ManualEditButton({
  entityType,
  id,
  fields,
  onSaved,
}: {
  entityType: string;
  id?: number;
  fields: { name: string; label: string; value?: unknown }[];
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{ reason: string; values: Record<string, unknown> } | null>(null);
  const [form] = Form.useForm();

  if (!id) return null;

  const start = async () => {
    const values = await form.validateFields();
    const { reason, ...rest } = values as { reason: string } & Record<string, unknown>;
    const changed: Record<string, unknown> = {};
    for (const f of fields) {
      const next = rest[f.name];
      const prev = f.value ?? '';
      if (String(next ?? '') !== String(prev ?? '')) changed[f.name] = next;
    }
    if (Object.keys(changed).length === 0) {
      toast.warning('Nothing changed');
      return;
    }
    setPending({ reason, values: changed });
    setConfirmOpen(true);
  };

  const save = async () => {
    if (!pending) return;
    try {
      await httpClient.post(`/records/${entityType}/${id}/manual`, {
        reason: pending.reason,
        fields: pending.values,
      });
      toast.success('Manual correction saved');
      setConfirmOpen(false);
      setOpen(false);
      setPending(null);
      onSaved?.();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Manual correction failed'));
    }
  };

  return (
    <>
      <Button size="small" data-testid="manual-edit" onClick={() => setOpen(true)}>
        Manual correction
      </Button>
      <Modal
        title="Manual correction"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void start()}
        okText="Review changes"
      >
        <Typography.Paragraph type="secondary">
          Use this only to fix mistakes or backfill history. Every change needs a reason and is flagged in the audit log.
        </Typography.Paragraph>
        <Form form={form} layout="vertical" initialValues={Object.fromEntries(fields.map((f) => [f.name, f.value]))}>
          {fields.map((f) => (
            <Form.Item key={f.name} name={f.name} label={f.label}>
              <Input />
            </Form.Item>
          ))}
          <Form.Item name="reason" label="Reason" rules={[{ required: true, min: 3, message: 'A reason is required' }]}>
            <Input.TextArea rows={2} aria-label="Manual edit reason" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Confirm changes"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={() => void save()}
        okText="Save correction"
        data-testid="manual-edit-confirm"
      >
        <Descriptions size="small" column={1} bordered>
          {pending
            ? Object.entries(pending.values).map(([field, next]) => {
                const prev = fields.find((f) => f.name === field)?.value;
                return (
                  <Descriptions.Item key={field} label={field}>
                    {String(prev ?? '—')} → {String(next ?? '—')}
                  </Descriptions.Item>
                );
              })
            : null}
        </Descriptions>
        <Typography.Paragraph style={{ marginTop: 12 }}>
          Reason: {pending?.reason}
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
