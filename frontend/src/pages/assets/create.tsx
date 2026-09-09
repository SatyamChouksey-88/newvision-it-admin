import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import type { Asset } from '../../types';
import { AssetFormFields } from './form-fields';

export function AssetCreate() {
  const { formProps, saveButtonProps } = useForm<Asset>({ resource: 'assets', action: 'create' });
  return (
    <Create saveButtonProps={saveButtonProps} title="New Asset">
      <Form {...formProps} layout="vertical">
        <AssetFormFields />
      </Form>
    </Create>
  );
}
