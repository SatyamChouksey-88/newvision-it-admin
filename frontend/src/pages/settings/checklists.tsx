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

  const create = async () => {
    try {
      await httpClient.post('/checklist-templates', {
        name,
        kind,
        items: items.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Template saved');
      setName('');
      reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save template'));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary">
        Onboarding and offboarding checklists. Start one from an employee profile — each step can be
        checked off there.
      </Typography.Paragraph>
      <Card size="small" title="New template">
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
          <Button type="primary" disabled={!name.trim()} onClick={() => void create()}>
            Save template
          </Button>
        </Space>
      </Card>
      {rows.map((t) => (
        <Card key={t.id} size="small" title={`${t.name} · ${t.kind}`}>
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
