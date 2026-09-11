import { Table, Typography } from 'antd';
import { Admonition } from '../../components/help/Admonition';
import type { Block } from '../../help/markdown';
import { renderInline } from '../../help/markdown';
import { COLOR_TEXT_SECONDARY } from '../../theme';

/** Renders the parsed block list — the same blocks the TOC and search index are built from. */
export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="nv-help-article-body">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const Tag = block.level === 2 ? 'h2' : 'h3';
          return (
            <Tag
              key={i}
              id={block.slug}
              style={{
                fontSize: block.level === 2 ? 18 : 15,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                marginTop: 28,
                marginBottom: 10,
                scrollMarginTop: 76,
              }}
            >
              {block.text}
            </Tag>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <Typography.Paragraph key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: '#1F1F1F' }}>
              {renderInline(block.text)}
            </Typography.Paragraph>
          );
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} className="nv-help-steps" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: 6 }}>
                  {renderInline(item)}
                </li>
              ))}
            </Tag>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={i} className="nv-help-code">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === 'table') {
          return (
            <Table
              key={i}
              size="small"
              pagination={false}
              style={{ margin: '12px 0 20px' }}
              columns={block.header.map((h, ci) => ({
                title: h,
                dataIndex: String(ci),
                key: String(ci),
                render: (v: string) => renderInline(v),
              }))}
              dataSource={block.rows.map((row, ri) => {
                const obj: Record<string, string> = { key: String(ri) };
                row.forEach((cell, ci) => {
                  obj[String(ci)] = cell;
                });
                return obj;
              })}
            />
          );
        }
        return <Admonition key={i} kind={block.kind} lines={block.lines} />;
      })}
      {blocks.length === 0 && (
        <Typography.Text style={{ color: COLOR_TEXT_SECONDARY }}>This article has no content yet.</Typography.Text>
      )}
    </div>
  );
}
