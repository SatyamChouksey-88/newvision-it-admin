import { Button, Card, DatePicker, Form, Input, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../providers/axios';
import { useToast } from './Toast';
import type { RecordNote } from '../types';
import { formatDate } from '../utils/format';

export function RecordNotes({
  entityType,
  entityId,
  canAdd,
}: {
  entityType: string;
  entityId?: number | string | null;
  canAdd: boolean;
}) {
  const toast = useToast();
  const [notes, setNotes] = useState<RecordNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (entityId == null) return;
    setLoading(true);
    try {
      const { data } = await httpClient.get('/notes', { params: { entityType, entityId: String(entityId) } });
      setNotes(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (values: { body: string; occurredAt?: dayjs.Dayjs }) => {
    try {
      const occurredAt = values.occurredAt?.toISOString();
      await httpClient.post('/notes', {
        entityType,
        entityId: String(entityId),
        body: values.body,
        occurredAt,
        isBackfilled: Boolean(occurredAt && values.occurredAt?.isBefore(dayjs().subtract(1, 'minute'))),
      });
      form.resetFields();
      toast.success('Note added');
      void load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not add note'));
    }
  };

  if (entityId == null) return null;

  return (
    <Card size="small" title="Notes" loading={loading} data-testid="record-notes">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {notes.length === 0 ? (
          <Typography.Text type="secondary">No notes yet.</Typography.Text>
        ) : (
          notes.map((n) => (
            <div key={n.id} data-testid="record-note">
              <Space size={8}>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {n.author?.fullName}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDate(n.occurredAt)}
                </Typography.Text>
                {n.isBackfilled ? (
                  <Tag data-testid="backfilled-tag" color="gold">
                    Backfilled
                  </Tag>
                ) : null}
              </Space>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{n.body}</div>
            </div>
          ))
        )}
        {canAdd ? (
          <Form form={form} layout="vertical" onFinish={(v) => void add(v)} style={{ marginTop: 8 }}>
            <Form.Item name="body" rules={[{ required: true, message: 'Write a note' }]}>
              <Input.TextArea rows={2} placeholder="Add a note (append-only)" aria-label="Note text" />
            </Form.Item>
            <Form.Item name="occurredAt" label="Occurred (leave blank for now)">
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Button htmlType="submit" type="primary" data-testid="add-note">
              Add note
            </Button>
          </Form>
        ) : null}
      </Space>
    </Card>
  );
}
