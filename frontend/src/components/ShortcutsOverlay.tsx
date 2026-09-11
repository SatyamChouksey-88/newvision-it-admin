import { Modal, Typography } from 'antd';

const ROWS: { keys: string; when: string }[] = [
  { keys: '/', when: 'Focus the list search' },
  { keys: '⌘K / Ctrl+K', when: 'Command palette' },
  { keys: 'J / K', when: 'Next / previous ticket row' },
  { keys: 'Enter', when: 'Open the focused ticket' },
  { keys: 'I', when: 'Assign the focused ticket to me' },
  { keys: 'Ctrl+/', when: 'This shortcuts overlay' },
  { keys: 'Help button', when: 'Documentation' },
];

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Keyboard shortcuts"
    >
      <div data-testid="shortcuts-overlay">
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        On this page. Help stays on the Help button — this overlay does not steal it.
      </Typography.Paragraph>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.keys}>
              <td style={{ padding: '6px 12px 6px 0', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>
                {r.keys}
              </td>
              <td style={{ padding: '6px 0', color: '#475569' }}>{r.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Modal>
  );
}
