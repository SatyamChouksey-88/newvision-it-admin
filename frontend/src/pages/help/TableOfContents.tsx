import { useEffect, useState } from 'react';
import type { Heading } from '../../help/markdown';
import { COLOR_LINK, COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY } from '../../theme';

/** Auto-generated from the article's own headings (never hand-maintained) — highlights on scroll. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeSlug, setActiveSlug] = useState<string | undefined>(headings[0]?.slug);

  useEffect(() => {
    setActiveSlug(headings[0]?.slug);
    if (headings.length === 0) return;
    const els = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" style={{ position: 'sticky', top: 76 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: COLOR_TEXT_MUTED,
          marginBottom: 10,
        }}
      >
        On this page
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderLeft: '1px solid #E9EDF2' }}>
        {headings.map((h) => (
          <li key={h.slug}>
            <a
              href={`#${h.slug}`}
              style={{
                display: 'block',
                padding: '4px 0 4px 12px',
                marginLeft: -1,
                fontSize: 12.5,
                lineHeight: 1.4,
                borderLeft: `2px solid ${activeSlug === h.slug ? COLOR_LINK : 'transparent'}`,
                color: activeSlug === h.slug ? COLOR_LINK : COLOR_TEXT_SECONDARY,
                fontWeight: activeSlug === h.slug ? 500 : 400,
                paddingLeft: h.level === 3 ? 22 : 12,
                textDecoration: 'none',
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
