import { Create, useForm } from '@refinedev/antd';
import { Form, Input } from 'antd';
import type { Location } from '../../types';

export function LocationCreate() {
  const { formProps, saveButtonProps } = useForm<Location>({
    resource: 'locations',
    action: 'create',
  });
  return (
    <Create saveButtonProps={saveButtonProps} title="New Location">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Code" name="code" rules={[{ required: true, max: 6 }]}>
          <Input placeholder="e.g. PUN" />
        </Form.Item>
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="City" name="city" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Address" name="address">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Create>
  );
}
