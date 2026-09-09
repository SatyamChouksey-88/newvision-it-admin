import { CopyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useToast } from './Toast';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const toast = useToast();
  return (
    <Button
      type="text"
      size="small"
      icon={<CopyOutlined />}
      aria-label={`Copy ${label ?? value}`}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(value).then(() => {
          toast.success(`Copied: ${value}`);
        });
      }}
    />
  );
}
