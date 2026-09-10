import { useState } from 'react';

/**
 * Quiet 16×16 copy chip (mockup ⧉). One control per value — no Ant icon button, no toast.
 */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`nv-copy-chip${copied ? ' is-copied' : ''}`}
      aria-label={`Copy ${label ?? value}`}
      title={`Copy ${label ?? value}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1000);
        });
      }}
    >
      {copied ? 'Copied' : '⧉'}
    </button>
  );
}
