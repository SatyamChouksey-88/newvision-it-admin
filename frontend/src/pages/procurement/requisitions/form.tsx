import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage, httpClient } from '../../../providers/axios';
import { LINE_KINDS, PROC_CATEGORIES, PROC_TYPES } from '../constants';

export function RequisitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [vendors, setVendors] = useState<
    { id: number; legalName: string; status: string; isPreferred?: boolean }[]
  >([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string; code: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    Promise.allSettled([
      httpClient.get('/vendors', { params: { _start: 0, _end: 200 } }),
      httpClient.get('/departments', { params: { _start: 0, _end: 100 } }),
      httpClient.get('/locations', { params: { _start: 0, _end: 100 } }),
    ]).then(([v, d, l]) => {
      if (v.status === 'fulfilled') setVendors(v.value.data.data ?? []);
      if (d.status === 'fulfilled') setDepartments(d.value.data.data ?? []);
      if (l.status === 'fulfilled') setLocations(l.value.data.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!id) {
      form.setFieldsValue({
        requestDate: dayjs(),
        lineItems: [{ product: '', unitCost: 0, quantity: 1, kind: 'serialized' }],
        taxAmount: 0,
      });
      return;
    }
    httpClient.get(`/purchase-requisitions/${id}`).then(({ data }) => {
      form.setFieldsValue({
        ...data,
        requestDate: data.requestDate ? dayjs(data.requestDate) : undefined,
        expectedProcurementDate: data.expectedProcurementDate
          ? dayjs(data.expectedProcurementDate)
          : undefined,
        expectedDeploymentDate: data.expectedDeploymentDate
          ? dayjs(data.expectedDeploymentDate)
          : undefined,
        locationIds: (data.locations ?? []).map((x: { locationId: number }) => x.locationId),
      });
    });
  }, [id, form]);

  const submit = async (values: Record<string, unknown>, asSubmit: boolean) => {
    setBusy(true);
    const payload = {
      ...values,
      requestDate: values.requestDate
        ? dayjs(values.requestDate as dayjs.Dayjs).toISOString()
        : undefined,
      expectedProcurementDate: values.expectedProcurementDate
        ? dayjs(values.expectedProcurementDate as dayjs.Dayjs).toISOString()
        : undefined,
      expectedDeploymentDate: values.expectedDeploymentDate
        ? dayjs(values.expectedDeploymentDate as dayjs.Dayjs).toISOString()
        : undefined,
      submit: asSubmit && !id,
    };
    try {
      let recId = id;
      if (id) {
        await httpClient.put(`/purchase-requisitions/${id}`, payload);
        if (asSubmit) await httpClient.post(`/purchase-requisitions/${id}/submit`);
        toast.success(asSubmit ? 'Submitted for approval' : 'Saved');
      } else {
        const { data } = await httpClient.post('/purchase-requisitions', payload);
        recId = String(data.id);
        toast.success(asSubmit ? 'Submitted for approval' : 'Draft saved');
      }
      if (file && recId) {
        const fd = new FormData();
        fd.append('file', file);
        await httpClient.post(`/purchase-requisitions/${recId}/attachments`, fd);
      }
      navigate(`/procurement/requisitions/show/${recId}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save requisition'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={id ? 'Edit requisition' : 'New purchase requisition'}>
      <Form form={form} layout="vertical" onFinish={(v) => void submit(v, false)}>
        <Form.Item name="title" label="Request Title" rules={[{ required: true, min: 3 }]}>
          <Input placeholder="Approval Request for Procurement of M365 E1 with Teams Licenses" />
        </Form.Item>
        <Form.Item name="departmentId" label="Requesting Department">
          <Select allowClear options={departments.map((d) => ({ value: d.id, label: d.name }))} />
        </Form.Item>
        <Form.Item name="departmentFreeText" label="Department (free text fallback)">
          <Input placeholder="IT Infrastructure Services (ITIS)" />
        </Form.Item>
        <Form.Item name="requestDate" label="Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="businessRequirement"
          label="Business Requirement"
          rules={[{ required: true, min: 3 }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="proposedMakeModel" label="Proposed Make & Model">
          <Input placeholder="Microsoft" />
        </Form.Item>
        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
          <Select options={PROC_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>

        <Form.List name="lineItems">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space
                  key={field.key}
                  align="start"
                  wrap
                  style={{ display: 'flex', marginBottom: 8 }}
                >
                  <Form.Item
                    {...field}
                    name={[field.name, 'product']}
                    rules={[{ required: true }]}
                    label="Product"
                  >
                    <Input style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'unitCost']}
                    rules={[{ required: true }]}
                    label="Unit Cost"
                  >
                    <InputNumber min={0} style={{ width: 120 }} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'quantity']}
                    rules={[{ required: true }]}
                    label="Quantity"
                  >
                    <InputNumber min={0} style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'commercialNotes']}
                    label="Commercial / notes"
                  >
                    <Input
                      style={{ width: 280 }}
                      placeholder="₹6,833/user with expiry on 17th July 2027"
                    />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'kind']}
                    label="Kind"
                    initialValue="serialized"
                  >
                    <Select options={LINE_KINDS} style={{ width: 180 }} />
                  </Form.Item>
                  <Button
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(field.name)}
                    aria-label="Remove row"
                  />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                Add line
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="taxAmount" label="Tax">
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item name="totalCost" label="Total Procurement Cost (leave blank to auto-calculate)">
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item name="vendorId" label="Vendor">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={vendors.map((v) => ({
              value: v.id,
              label: `${v.legalName}${v.isPreferred ? ' · preferred' : ''} (${v.status})`,
              disabled: v.status === 'suspended' || v.status === 'blacklisted',
            }))}
          />
        </Form.Item>
        <Form.Item
          name="vendorFreeText"
          label="New vendor name (creates a pending-approval vendor)"
        >
          <Input />
        </Form.Item>
        <Form.Item name="budgetHead" label="Budget Head">
          <Input placeholder="IT & Finance" />
        </Form.Item>
        <Form.Item name="procurementType" label="Procurement Type" rules={[{ required: true }]}>
          <Select options={PROC_TYPES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item name="locationIds" label="Deployment Location">
          <Select
            mode="multiple"
            options={locations.map((l) => ({ value: l.id, label: `${l.name} (${l.code})` }))}
          />
        </Form.Item>
        <Form.Item name="remoteEmployees" valuePropName="checked">
          <Checkbox>Remote Employees</Checkbox>
        </Form.Item>
        <Form.Item name="locationFreeText" label="Location (free text)">
          <Input />
        </Form.Item>
        <Form.Item name="expectedProcurementDate" label="Expected Procurement Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="expectedDeploymentDate" label="Expected Deployment Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Quote / vendor email / PDF">
          <Upload
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            maxCount={1}
            onRemove={() => setFile(null)}
          >
            <Button>Attach file</Button>
          </Upload>
        </Form.Item>
        <Space>
          <Button htmlType="submit" loading={busy}>
            Save draft
          </Button>
          <Button
            type="primary"
            loading={busy}
            onClick={() => form.validateFields().then((v) => submit(v, true))}
          >
            Submit for approval
          </Button>
          <Button onClick={() => navigate('/procurement/requisitions')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
