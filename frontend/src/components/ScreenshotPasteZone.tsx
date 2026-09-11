import { Button, Space, Typography } from 'antd';
import { type ReactNode, useEffect, useRef } from 'react';
import { clipboardImageToFile, readClipboardImage } from '../utils/clipboardImage';
import { useToast } from './Toast';

/** Attach-file plus paste-from-Snipping-Tool on ticket create/detail. */
export function ScreenshotPasteZone({
  onFile,
  children,
}: {
  onFile: (file: File) => void | Promise<void>;
  children?: ReactNode;
}) {
  const toast = useToast();
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;
  const hoverRef = useRef(false);

  const apply = async (file: File | null, { silent }: { silent?: boolean } = {}) => {
    if (!file) {
      if (!silent) {
        toast.error('No image on the clipboard. Copy a snip (Win+Shift+S), then try again.');
      }
      return;
    }
    await onFileRef.current(file);
  };

  useEffect(() => {
    const onWin = (e: Event) => {
      if (!hoverRef.current) return;
      const file = clipboardImageToFile((e as ClipboardEvent).clipboardData);
      if (!file) return;
      e.preventDefault();
      void onFileRef.current(file);
    };
    window.addEventListener('paste', onWin);
    return () => window.removeEventListener('paste', onWin);
  }, []);

  return (
    <section
      aria-label="Attachments. Paste a screenshot with Ctrl+V."
      className="nv-paste-zone"
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
    >
      <Space wrap align="center">
        {children}
        <Button size="small" onClick={() => void readClipboardImage().then((f) => apply(f))}>
          Paste screenshot
        </Button>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Or press Ctrl+V after copying a snip
        </Typography.Text>
      </Space>
    </section>
  );
}
