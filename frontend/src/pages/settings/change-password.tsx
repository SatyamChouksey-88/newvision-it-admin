import { Button, Card, Form, Input } from 'antd';
import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { apiErrorMessage, httpClient } from '../../providers/axios';

export function ChangePasswordCard() {
  const toast = useToast();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const submit = async (values: { currentPassword: string; newPassword: string }) => {
    setSaving(true);
    try {
      await httpClient.post('/auth/change-password', values);
      toast.success('Password changed');
      form.resetFields();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card size="small" title="Change password">
      <Form form={form} layout="vertical" onFinish={submit} style={{ maxWidth: 320 }}>
        <Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="New password"
          rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Change password
        </Button>
      </Form>
    </Card>
  );
}
