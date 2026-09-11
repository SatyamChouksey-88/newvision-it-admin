import { useSelect } from '@refinedev/antd';
import { Col, DatePicker, Form, Input, InputNumber, Row, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { assetCodeError, assetCodePrefixPreview, normalizeAssetCode } from '../../utils/assetCode';

const dateProps = {
  getValueProps: (v?: string) => ({ value: v ? dayjs(v) : undefined }),
  normalize: (v: dayjs.Dayjs | null) => (v ? v.toISOString() : undefined),
};

type CodedRow = { id: number; code?: string };

function rowsFromSelect(select: { query?: { data?: { data?: CodedRow[] } }; queryResult?: { data?: { data?: CodedRow[] } } }) {
  return select.query?.data?.data ?? select.queryResult?.data?.data ?? [];
}

export function AssetFormFields() {
  const form = Form.useFormInstance();
  const typedCode = Form.useWatch('assetCode', form) as string | undefined;
  const locationId = Form.useWatch('locationId', form) as number | undefined;
  const categoryId = Form.useWatch('categoryId', form) as number | undefined;

  const categorySelect = useSelect({
    resource: 'asset-categories',
    optionLabel: 'name',
    optionValue: 'id',
    pagination: { pageSize: 100 },
  });
  const locationSelect = useSelect({
    resource: 'locations',
    optionLabel: 'name',
    optionValue: 'id',
    pagination: { pageSize: 100 },
  });
  const { selectProps: departmentSelect } = useSelect({
    resource: 'departments',
    optionLabel: 'name',
    optionValue: 'id',
    pagination: { pageSize: 100 },
  });

  const locations = rowsFromSelect(locationSelect as never);
  const categories = rowsFromSelect(categorySelect as never);
  const locCode = locations.find((r) => r.id === locationId)?.code;
  const catCode = categories.find((r) => r.id === categoryId)?.code;
  const normalized = typedCode ? normalizeAssetCode(typedCode) : '';
  const preview = !normalized ? assetCodePrefixPreview(locCode, catCode) : null;

  return (
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="Asset number"
          name="assetCode"
          extra={
            normalized ? (
              <Typography.Text type="secondary">
                This exact code will be saved ({normalized})
              </Typography.Text>
            ) : preview ? (
              <Typography.Text type="secondary">Will be assigned {preview}</Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                Leave blank to auto-assign from location and category.
              </Typography.Text>
            )
          }
          rules={[
            {
              validator: async (_, value?: string) => {
                if (!value?.trim()) return;
                const code = normalizeAssetCode(value);
                const err = assetCodeError(code);
                if (err) throw new Error(err);
              },
            },
          ]}
          normalize={(v: string | undefined) => v}
        >
          <Input
            className="nv-mono"
            placeholder="Leave blank to auto-assign (AST-PUN-LAP-0001)"
            autoComplete="off"
            onBlur={(e) => {
              const next = normalizeAssetCode(e.target.value);
              form.setFieldValue('assetCode', next || undefined);
            }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
          <Select {...categorySelect.selectProps} placeholder="Select category" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Location" name="locationId" rules={[{ required: true }]}>
          <Select {...locationSelect.selectProps} placeholder="Select location" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Department" name="departmentId">
          <Select {...departmentSelect} allowClear placeholder="Optional" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Condition" name="condition" initialValue="good">
          <Select
            options={[
              { label: 'New', value: 'new' },
              { label: 'Good', value: 'good' },
              { label: 'Fair', value: 'fair' },
              { label: 'Poor', value: 'poor' },
            ]}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Brand" name="brand">
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Model" name="model">
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Serial Number" name="serialNumber">
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Purchase Cost (₹)" name="purchaseCost">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Purchase Date" name="purchaseDate" {...dateProps}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Vendor" name="vendor">
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Warranty Start" name="warrantyStart" {...dateProps}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Warranty End" name="warrantyEnd" {...dateProps}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Invoice No" name="invoiceNo">
          <Input />
        </Form.Item>
      </Col>
    </Row>
  );
}
