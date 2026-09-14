import { Alert, Button, Card, Form, Input, Select, Space, Switch, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { PROC_CATEGORIES } from '../constants';

type VendorHit = { id: number; vendorCode: string; legalName: string; taxId?: string | null };

export function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<VendorHit[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    httpClient
      .get(`/vendors/${id}`)
      .then(({ data }) => form.setFieldsValue({ ...data, categories: data.categories ?? [] }));
  }, [id, form]);

  const searchExisting = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = q.trim();
    if (!term || term.length < 3) {
      setMatches([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      httpClient
        .get('/vendors', { params: { q: term, _start: 0, _end: 8 } })
        .then(({ data }) => {
          const rows = (data.data ?? []) as VendorHit[];
          setMatches(id ? rows.filter((r) => String(r.id) !== id) : rows);
        })
        .catch(() => setMatches([]));
    }, 280);
  };

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
            const body = (e as { response?: { data?: { existingVendorId?: number; vendorCode?: string } } })
              ?.response?.data;
            if (body?.existingVendorId) {
              toast.error(
                `${apiErrorMessage(e, 'This vendor already exists')} — open ${body.vendorCode ?? 'the existing vendor'}.`,
              );
            } else {
              toast.error(apiErrorMessage(e, 'Could not save vendor'));
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        {!id && matches.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Possible existing vendor"
            description={
              <Space direction="vertical" size={4}>
                <Typography.Text>
                  Search-before-create found a match. Open it instead of creating a duplicate.
                </Typography.Text>
                {matches.map((m) => (
                  <Link key={m.id} to={`/procurement/vendors/show/${m.id}`}>
                    {m.vendorCode} · {m.legalName}
                    {m.taxId ? ` · ${m.taxId}` : ''}
                  </Link>
                ))}
              </Space>
            }
          />
        ) : null}
        <Form.Item name="legalName" label="Legal name" rules={[{ required: true, min: 2 }]}>
          <Input onChange={(e) => searchExisting(e.target.value)} />
        </Form.Item>
        <Form.Item name="tradingName" label="Trading name">
          <Input />
        </Form.Item>
        <Form.Item name="taxId" label="Tax ID (GST / VAT / registration)">
          <Input onChange={(e) => searchExisting(e.target.value)} />
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
          <Input onChange={(e) => searchExisting(e.target.value.replace(/\D/g, ''))} />
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
