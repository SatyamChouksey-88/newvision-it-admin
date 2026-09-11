import { Button, Card, Form, Input, Select, Space, Switch } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { PROC_CATEGORIES } from '../constants';

export function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    httpClient
      .get(`/vendors/${id}`)
      .then(({ data }) => form.setFieldsValue({ ...data, categories: data.categories ?? [] }));
  }, [id, form]);

  return (
    <Card title={id ? 'Edit vendor' : 'New vendor'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={async (v) => {
          setBusy(true);
          try {
            if (id) {
              await httpClient.put(`/vendors/${id}`, v);
              toast.success('Vendor updated');
              navigate(`/procurement/vendors/show/${id}`);
            } else {
              const { data } = await httpClient.post('/vendors', v);
              toast.success('Vendor created as draft');
              navigate(`/procurement/vendors/show/${data.id}`);
            }
          } catch (e) {
            toast.error(apiErrorMessage(e, 'Could not save vendor'));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Form.Item name="legalName" label="Legal name" rules={[{ required: true, min: 2 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tradingName" label="Trading name">
          <Input />
        </Form.Item>
        <Form.Item name="taxId" label="Tax ID (GST / VAT / registration)">
          <Input />
        </Form.Item>
        <Form.Item name="country" label="Country" initialValue="IN">
          <Input />
        </Form.Item>
        <Form.Item name="registeredAddress" label="Registered address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="remitToAddress" label="Remit-to address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="paymentTerms" label="Payment terms" initialValue="Net 30">
          <Input />
        </Form.Item>
        <Form.Item name="currency" label="Currency" initialValue="INR">
          <Input />
        </Form.Item>
        <Form.Item name="bankAccountNumber" label="Bank account">
          <Input />
        </Form.Item>
        <Form.Item name="bankIfscSwift" label="IFSC / SWIFT">
          <Input />
        </Form.Item>
        <Form.Item name="defaultBudgetHead" label="Default budget head">
          <Input />
        </Form.Item>
        <Form.Item name="categories" label="Categories supplied">
          <Select mode="multiple" options={PROC_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item name="isPreferred" label="Preferred" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={busy}>
            Save
          </Button>
          <Button onClick={() => navigate(-1)}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
