import { App } from 'antd';

export function useConfirmAction() {
  const { modal } = App.useApp();

  const confirmAction = (opts: {
    title: string;
    content: string;
    okText: string;
    okDanger?: boolean;
    onOk: () => Promise<void> | void;
  }): Promise<boolean> =>
    new Promise((resolve) => {
      modal.confirm({
        title: opts.title,
        content: opts.content,
        okText: opts.okText,
        okButtonProps: opts.okDanger ? { danger: true } : undefined,
        cancelText: 'Cancel',
        onOk: async () => {
          await opts.onOk();
          resolve(true);
        },
        onCancel: () => resolve(false),
      });
    });

  return { confirmAction };
}
