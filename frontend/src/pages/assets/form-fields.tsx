import { useSelect } from '@refinedev/antd';
import { Col, DatePicker, Form, Input, InputNumber, Row, Select } from 'antd';
import dayjs from 'dayjs';

const dateProps = {
  getValueProps: (v?: string) => ({ value: v ? dayjs(v) : undefined }),
  normalize: (v: dayjs.Dayjs | null) => (v ? v.toISOString() : undefined),
};

export function AssetFormFields() {
  const { selectProps: categorySelect } = useSelect({
    resource: 'asset-categories',
    optionLabel: 'name',
    optionValue: 'id',
    pagination: { pageSize: 100 },
  });
  const { selectProps: locationSelect } = useSelect({
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

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
          <Select {...categorySelect} placeholder="Select category" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Location" name="locationId" rules={[{ required: true }]}>
          <Select {...locationSelect} placeholder="Select location" />
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
