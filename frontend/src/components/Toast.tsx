import { App as AntdApp } from 'antd';

/** Shared toast helper — use instead of ad-hoc message calls. */
export function useToast() {
  const { message } = AntdApp.useApp();
  return {
    success: (text: string) => message.success(text),
    error: (text: string) => message.error(text),
    info: (text: string) => message.info(text),
    warning: (text: string) => message.warning(text),
  };
}
