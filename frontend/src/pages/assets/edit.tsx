import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import type { Asset } from '../../types';
import { AssetFormFields } from './form-fields';

export function AssetEdit() {
  const { formProps, saveButtonProps } = useForm<Asset>({ resource: 'assets', action: 'edit' });
  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit Asset">
      <Form {...formProps} layout="vertical">
        <AssetFormFields />
      </Form>
    </Edit>
  );
}
