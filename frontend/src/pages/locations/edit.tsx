import { Edit, useForm } from '@refinedev/antd';
import { Form, Input } from 'antd';
import type { Location } from '../../types';

export function LocationEdit() {
  const { formProps, saveButtonProps } = useForm<Location>({
    resource: 'locations',
    action: 'edit',
  });
  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit Location">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Code" name="code" rules={[{ required: true, max: 6 }]}>
          <Input />
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
    </Edit>
  );
}
