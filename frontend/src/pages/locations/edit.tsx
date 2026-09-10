import { Edit, useForm } from '@refinedev/antd';
import { Form, Input } from 'antd';
import { useParams } from 'react-router';
import { ManualEditButton } from '../../components/ManualEdit';
import { RecordNotes } from '../../components/RecordNotes';
import type { Location } from '../../types';

export function LocationEdit() {
  const { id } = useParams();
  const { formProps, saveButtonProps } = useForm<Location>({
    resource: 'locations',
    action: 'edit',
  });
  const locId = id ? Number(id) : undefined;
  const loc = formProps.initialValues as Location | undefined;
  return (
    <Edit
      saveButtonProps={saveButtonProps}
      title="Edit Location"
      headerButtons={
        locId ? (
          <ManualEditButton
            entityType="Location"
            id={locId}
            fields={[
              { name: 'code', label: 'Code', value: loc?.code },
              { name: 'name', label: 'Name', value: loc?.name },
              { name: 'city', label: 'City', value: loc?.city },
              { name: 'address', label: 'Address', value: loc?.address },
            ]}
          />
        ) : undefined
      }
    >
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
      <RecordNotes entityType="Location" entityId={locId} canAdd />
    </Edit>
  );
}
