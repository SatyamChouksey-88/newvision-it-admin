import { FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Modal, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { searchHelp, type SearchResult } from '../../help/searchIndex';
import { COLOR_TEXT_MUTED } from '../../theme';

/**
 * Instant client-side search, MkDocs-Material style: no server round-trip, matches both whole
 * pages and specific sections within a page. `initializing` briefly mirrors the reference site's
 * "Initializing search" state on first open (the index is built lazily on first query).
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<React.ComponentRef<typeof Input> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setInitializing(true);
      const t = setTimeout(() => {
        setInitializing(false);
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const onChange = (v: string) => {
    setQuery(v);
    setActiveIndex(0);
    setResults(v.trim().length >= 2 ? searchHelp(v) : []);
  };

  const go = (r: SearchResult) => {
    onClose();
    navigate(`/help/${r.article.id}${r.headingSlug ? `#${r.headingSlug}` : ''}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={600}
      centered
      destroyOnHidden
      styles={{ content: { padding: 0, borderRadius: 8, overflow: 'hidden' }, body: { padding: 0 } }}
      aria-label="Search documentation"
    >
      <div style={{ borderBottom: '1px solid #F1F4F8', padding: '0 14px' }}>
        <Input
          ref={inputRef}
          variant="borderless"
          size="large"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          prefix={<SearchOutlined style={{ color: COLOR_TEXT_MUTED, marginRight: 4 }} />}
          placeholder="Search the docs…"
          style={{ padding: '14px 4px' }}
        />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 6px 10px' }} role="listbox">
        {initializing ? (
          <Typography.Text style={{ display: 'block', padding: '24px 14px', fontSize: 13, color: COLOR_TEXT_MUTED }}>
            Initializing search…
          </Typography.Text>
        ) : query.trim().length < 2 ? (
          <Typography.Text style={{ display: 'block', padding: '24px 14px', fontSize: 13, color: COLOR_TEXT_MUTED }}>
            Type at least 2 characters to search every article and section.
          </Typography.Text>
        ) : results.length === 0 ? (
          <Typography.Text style={{ display: 'block', padding: '24px 14px', fontSize: 13, color: COLOR_TEXT_MUTED }}>
            No matches for "{query}".
          </Typography.Text>
        ) : (
          results.map((r, idx) => (
            <div
              key={`${r.article.id}-${r.headingSlug ?? 'top'}`}
              role="option"
              tabIndex={-1}
              aria-selected={idx === activeIndex}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => go(r)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '9px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                background: idx === activeIndex ? '#F0F7FF' : undefined,
              }}
            >
              <FileTextOutlined style={{ color: COLOR_TEXT_MUTED, marginTop: 3, fontSize: 12 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {r.article.title}
                  {r.headingText ? (
                    <span style={{ fontWeight: 400, color: COLOR_TEXT_MUTED }}> › {r.headingText}</span>
                  ) : null}
                </div>
                {!r.headingText && (
                  <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, marginTop: 1 }}>{r.article.summary}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
