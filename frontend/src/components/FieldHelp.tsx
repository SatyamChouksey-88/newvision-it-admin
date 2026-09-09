import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

/** Contextual inline help on complex form fields (Prompt 3 + 6). */
export function FieldHelp({ title, text }: { title?: string; text: string }) {
  return (
    <Tooltip title={<span>{title ? <strong>{title}: </strong> : null}{text}</span>}>
      <QuestionCircleOutlined
        style={{ marginLeft: 6, color: '#64748B', fontSize: 12, cursor: 'help' }}
        aria-label={`Help: ${text}`}
      />
    </Tooltip>
  );
}
