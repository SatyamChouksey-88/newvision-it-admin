import { Edit, useForm } from '@refinedev/antd';
import { App as AntdApp, Form } from 'antd';
import { apiErrorMessage } from '../../providers/axios';
import type { Asset } from '../../types';
import { assetCodeError, normalizeAssetCode } from '../../utils/assetCode';
import { AssetFormFields } from './form-fields';

export function AssetEdit() {
  const { modal } = AntdApp.useApp();
  const { formProps, saveButtonProps, form, query } = useForm<Asset>({
    resource: 'assets',
    action: 'edit',
    errorNotification: (error) => {
      const msg = apiErrorMessage(error, 'Could not update asset');
      if (/already exists/i.test(msg)) {
        form.setFields([{ name: 'assetCode', errors: [msg] }]);
      }
      return { message: msg, type: 'error' };
    },
  });
  const currentCode = query?.data?.data?.assetCode ?? '';

  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit Asset">
      <Form
        {...formProps}
        layout="vertical"
        onFinish={async (values) => {
          const raw = (values as { assetCode?: string }).assetCode;
          const next = raw ? normalizeAssetCode(raw) : '';
          if (next && next !== currentCode) {
            const err = assetCodeError(next);
            if (err) {
              form.setFields([{ name: 'assetCode', errors: [err] }]);
              return;
            }
            const ok = await new Promise<boolean>((resolve) => {
              modal.confirm({
                title: 'Change asset number?',
                content: `${currentCode} → ${next}. QR stickers and scan links for the old code will stop working.`,
                okText: 'Change number',
                cancelText: 'Cancel',
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
              });
            });
            if (!ok) {
              form.setFieldValue('assetCode', currentCode);
              return;
            }
            (values as { assetCode?: string }).assetCode = next;
          } else {
            delete (values as { assetCode?: string }).assetCode;
          }
          return formProps.onFinish?.(values);
        }}
      >
        <AssetFormFields />
      </Form>
    </Edit>
  );
}
