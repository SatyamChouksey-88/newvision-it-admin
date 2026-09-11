import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { apiErrorMessage } from '../../providers/axios';
import type { Asset } from '../../types';
import { assetCodeError, normalizeAssetCode } from '../../utils/assetCode';
import { AssetFormFields } from './form-fields';

export function AssetCreate() {
  const { formProps, saveButtonProps, form } = useForm<Asset>({
    resource: 'assets',
    action: 'create',
    errorNotification: (error) => {
      const msg = apiErrorMessage(error, 'Could not create asset');
      if (/already exists/i.test(msg)) {
        form.setFields([{ name: 'assetCode', errors: [msg] }]);
      }
      return { message: msg, type: 'error' };
    },
  });

  return (
    <Create saveButtonProps={saveButtonProps} title="New Asset">
      <Form
        {...formProps}
        layout="vertical"
        onFinish={async (values) => {
          const raw = (values as { assetCode?: string }).assetCode;
          const code = raw ? normalizeAssetCode(raw) : '';
          if (code) {
            const err = assetCodeError(code);
            if (err) {
              form.setFields([{ name: 'assetCode', errors: [err] }]);
              return;
            }
            (values as { assetCode?: string }).assetCode = code;
          } else {
            delete (values as { assetCode?: string }).assetCode;
          }
          return formProps.onFinish?.(values);
        }}
      >
        <AssetFormFields />
      </Form>
    </Create>
  );
}
