import type { ReactNode } from 'react';

export type Block =
  | { type: 'heading'; level: 2 | 3; text: string; slug: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'admonition'; kind: 'note' | 'tip' | 'warning'; lines: string[] }
  | { type: 'code'; lang?: string; text: string };

export interface Heading {
  level: 2 | 3;
  text: string;
  slug: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const ADMONITION_RE = /^>\s*\[!(NOTE|TIP|WARNING)\]\s*$/i;

/**
 * A small markdown-lite parser for Help content: headings (## / ###), paragraphs, numbered/
 * bulleted lists, pipe tables, and GitHub-style admonition blocks (`> [!NOTE]` … `> …`). Parsed
 * once into a block list that both the article renderer and the table-of-contents/search index
 * walk, so the TOC can never drift from what's actually on the page.
 */
export function parseMarkdown(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const text = buf.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || undefined;
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', lang, text: code.join('\n') });
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length as 2 | 3;
      const text = heading[2].trim();
      blocks.push({ type: 'heading', level, text, slug: slugify(text) });
      i += 1;
      continue;
    }

    if (ADMONITION_RE.test(line)) {
      const kind = ADMONITION_RE.exec(line)![1].toLowerCase() as 'note' | 'tip' | 'warning';
      const admLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].startsWith('>')) {
        admLines.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'admonition', kind, lines: admLines.filter(Boolean) });
      continue;
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const cells = (l: string) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
      const header = cells(tableLines[0]);
      const rows = tableLines.slice(2).map(cells);
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.*)$/.exec(line);
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (orderedMatch || bulletMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered ? /^\d+\.\s+(.*)$/.exec(lines[i]) : /^[-*]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph: gather until a blank line or the start of another block type.
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,3})\s+/.test(lines[i]) &&
      !ADMONITION_RE.test(lines[i]) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].startsWith('|') &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    flushParagraph(buf);
  }

  return blocks;
}

export function extractHeadings(blocks: Block[]): Heading[] {
  return blocks
    .filter((b): b is Extract<Block, { type: 'heading' }> => b.type === 'heading')
    .map((b) => ({ level: b.level, text: b.text, slug: b.slug }));
}

/** Plain-text flatten of every block — used to build the search index. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'heading' || b.type === 'paragraph') return b.text;
      if (b.type === 'list') return b.items.join(' ');
      if (b.type === 'table') return [b.header.join(' '), ...b.rows.map((r) => r.join(' '))].join(' ');
      if (b.type === 'code') return b.text;
      return b.lines.join(' ');
    })
    .join(' ')
    .replace(/[*`]/g, '');
}

/** Renders **bold** and `code` inline spans within a plain-text run. */
export function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*.+?\*\*|`.+?`)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="nv-mono" style={{ background: '#F1F4F8', padding: '1px 5px', borderRadius: 4 }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
