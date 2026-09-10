import { Button, Card, Input, Select, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import { useToast } from '../../components/Toast';

interface Template {
  id: number;
  name: string;
  kind: 'onboard' | 'offboard';
  items: { id: number; label: string }[];
}

export function ChecklistsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'onboard' | 'offboard'>('onboard');
  const [items, setItems] = useState('Issue laptop\nCreate login\nVPN / MFA');

  const reload = useCallback(() => {
    httpClient
      .get('/checklist-templates')
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = async () => {
    const payload = {
      name,
      kind,
      items: items.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await httpClient.patch(`/checklist-templates/${editingId}`, payload);
        toast.success('Template updated');
      } else {
        await httpClient.post('/checklist-templates', payload);
        toast.success('Template saved');
      }
      setEditingId(null);
      setName('');
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save template'));
    }
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setName(t.name);
    setKind(t.kind);
    setItems(t.items.map((i) => i.label).join('\n'));
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary">
        Onboarding and offboarding checklists. Start one from an employee profile — each step can be
        checked off there.
      </Typography.Paragraph>
      <Card size="small" title={editingId ? 'Edit template' : 'New template'}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            value={kind}
            onChange={setKind}
            options={[
              { value: 'onboard', label: 'Onboarding' },
              { value: 'offboard', label: 'Offboarding' },
            ]}
          />
          <Input.TextArea rows={4} value={items} onChange={(e) => setItems(e.target.value)} />
          <Space>
            <Button type="primary" disabled={!name.trim()} onClick={() => void save()}>
              {editingId ? 'Update template' : 'Save template'}
            </Button>
            {editingId ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setName('');
                }}
              >
                Cancel
              </Button>
            ) : null}
          </Space>
        </Space>
      </Card>
      {rows.map((t) => (
        <Card
          key={t.id}
          size="small"
          title={`${t.name} · ${t.kind}`}
          extra={
            <Button type="link" size="small" onClick={() => startEdit(t)}>
              Edit
            </Button>
          }
        >
          <ol>
            {t.items.map((i) => (
              <li key={i.id}>{i.label}</li>
            ))}
          </ol>
        </Card>
      ))}
    </Space>
  );
}
