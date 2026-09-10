import { ArrowLeftOutlined, ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Browser-style Back / Forward / Refresh — shown on every authenticated page.
 * Tracks in-app history so Forward is only enabled after Back.
 */
export function HistoryNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const key = `${location.pathname}${location.search}`;
  const skip = useRef<'back' | 'fwd' | null>(null);
  const cursorRef = useRef(0);
  const [stack, setStack] = useState<string[]>([key]);
  const [cursor, setCursor] = useState(0);
  cursorRef.current = cursor;

  useEffect(() => {
    if (skip.current) {
      skip.current = null;
      return;
    }
    setStack((prev) => {
      const head = prev.slice(0, cursorRef.current + 1);
      if (head[head.length - 1] === key) return prev;
      const next = [...head, key];
      setCursor(next.length - 1);
      return next;
    });
  }, [key]);

  const canBack = cursor > 0;
  const canFwd = cursor < stack.length - 1;

  return (
    <div className="nv-history-nav" role="toolbar" aria-label="Page navigation">
      <button
        type="button"
        className="nv-history-btn"
        aria-label="Back"
        title="Back"
        disabled={!canBack}
        onClick={() => {
          if (!canBack) return;
          skip.current = 'back';
          setCursor((c) => c - 1);
          navigate(-1);
        }}
      >
        <ArrowLeftOutlined />
      </button>
      <button
        type="button"
        className="nv-history-btn"
        aria-label="Forward"
        title="Forward"
        disabled={!canFwd}
        onClick={() => {
          if (!canFwd) return;
          skip.current = 'fwd';
          setCursor((c) => c + 1);
          navigate(1);
        }}
      >
        <ArrowRightOutlined />
      </button>
      <button
        type="button"
        className="nv-history-btn"
        aria-label="Refresh"
        title="Refresh"
        onClick={() => window.location.reload()}
      >
        <ReloadOutlined />
      </button>
    </div>
  );
}
