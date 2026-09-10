import { Button, Card, Form, Input, Select, Space, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AssetSelect } from '../../components/AssetSelect';
import { EmployeeMultiSelect } from '../../components/EmployeeSelect';
import { TICKET_PRIORITY_OPTIONS } from '../../components/TicketStatusTag';
import { useToast } from '../../components/Toast';
import { apiErrorMessage, httpClient } from '../../providers/axios';
import type { TicketCategory, TicketPriority, TicketTemplate } from '../../types';

export function TicketCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    httpClient.get('/ticket-categories').then(({ data }) => {
      const rows = Array.isArray(data) ? data : (data.data ?? []);
      setCategories(rows);
    });
    httpClient.get('/ticket-templates').then(({ data }) => {
      setTemplates(Array.isArray(data) ? data : (data.data ?? []));
    });
  }, []);

  const applyTemplate = (id: number) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const cat = categories.find((c) => c.id === tpl.categoryId);
    form.setFieldsValue({
      templateId: id,
      subject: tpl.subject,
      description: tpl.description,
      categoryId: tpl.categoryId,
      priority: cat?.defaultPriority ?? 'medium',
    });
  };

  const onCategory = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) form.setFieldsValue({ priority: cat.defaultPriority as TicketPriority });
  };

  const submit = async (values: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { data } = await httpClient.post('/support-tickets', {
        subject: values.subject,
        description: values.description,
        categoryId: values.categoryId,
        priority: values.priority,
        assetId: values.assetId,
        templateId: values.templateId,
        watcherEmployeeIds: values.watcherEmployeeIds,
        autoAssign: true,
      });
      if (file && data?.id) {
        const fd = new FormData();
        fd.append('file', file);
        await httpClient.post(`/support-tickets/${data.id}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(`Opened ${data.ticketNumber}`);
      navigate(`/tickets/show/${data.id}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not raise ticket'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Raise a ticket">
      <Typography.Paragraph type="secondary">
        For hardware repairs on a specific asset, use Maintenance. To request a new laptop or accessory, use Requests.
        Use this form for everything else.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => void submit(v)}
        initialValues={{ priority: 'medium', templateId: params.get('template') ? Number(params.get('template')) : undefined }}
      >
        <Form.Item name="templateId" label="Start from a template (optional)">
          <Select
            allowClear
            placeholder="Blank form"
            aria-label="Ticket template"
            options={templates.map((t) => ({ label: t.title, value: t.id }))}
            onChange={(id) => {
              if (id) applyTemplate(id as number);
            }}
          />
        </Form.Item>
        <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
          <Select
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
            onChange={(id) => onCategory(id as number)}
          />
        </Form.Item>
        <Form.Item name="priority" label="Priority">
          <Select options={TICKET_PRIORITY_OPTIONS} />
        </Form.Item>
        <Form.Item name="subject" label="Subject" rules={[{ required: true, min: 3 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description" rules={[{ required: true, min: 3 }]}>
          <Input.TextArea rows={5} />
        </Form.Item>
        <Form.Item name="assetId" label="Linked asset (optional)">
          <AssetSelect />
        </Form.Item>
        <Form.Item name="watcherEmployeeIds" label="Watchers (optional)">
          <EmployeeMultiSelect placeholder="People who should be notified" />
        </Form.Item>
        <Form.Item label="Attachment (optional)">
          <Upload
            maxCount={1}
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            onRemove={() => setFile(null)}
          >
            <Button>Choose file</Button>
          </Upload>
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={busy} data-testid="submit-ticket">
            Submit ticket
          </Button>
          <Button onClick={() => navigate('/tickets')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
