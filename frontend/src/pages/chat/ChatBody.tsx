import {
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { httpClient } from '../../providers/axios';

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re =
    /\[@([^\]]+)\]\(mention:(\d+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*|(https?:\/\/[^\s<]+)|(@channel)|(@here)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1] && m[2]) {
      nodes.push(
        <span key={k} className="nv-chat-mention">
          @{m[1]}
        </span>,
      );
    } else if (m[3]) {
      nodes.push(
        <code key={k} className="nv-chat-code">
          {m[3]}
        </code>,
      );
    } else if (m[4]) {
      nodes.push(<strong key={k}>{m[4]}</strong>);
    } else if (m[5]) {
      nodes.push(<s key={k}>{m[5]}</s>);
    } else if (m[6]) {
      nodes.push(<em key={k}>{m[6]}</em>);
    } else if (m[7]) {
      const href = m[7].replace(/[.,;)]+$/, '');
      nodes.push(
        <a key={k} href={href} target="_blank" rel="noreferrer" className="nv-chat-link">
          {href}
        </a>,
      );
    } else if (m[8] || m[9]) {
      nodes.push(
        <span key={k} className="nv-chat-mention nv-chat-mention-all">
          {m[8] || m[9]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderBlocks(body: string): React.ReactNode {
  const parts = body.split(/```/);
  const out: React.ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      out.push(
        <pre key={`pre-${idx}`} className="nv-chat-pre">
          <code>{part.replace(/^\w*\n/, '')}</code>
        </pre>,
      );
      return;
    }
    const lines = part.split('\n');
    let list: { ordered: boolean; items: string[] } | null = null;
    const flush = () => {
      if (!list) return;
      const Tag = list.ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={`l-${out.length}`} className="nv-chat-list-md">
          {list.items.map((it, i) => (
            <li key={i}>{renderInline(it, `li-${out.length}-${i}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    };
    for (const line of lines) {
      const ul = /^[-*] (.+)$/.exec(line);
      const ol = /^\d+\. (.+)$/.exec(line);
      if (ul || ol) {
        const ordered = Boolean(ol);
        if (!list || list.ordered !== ordered) {
          flush();
          list = { ordered, items: [] };
        }
        list.items.push((ul ?? ol)![1]);
        continue;
      }
      flush();
      if (line.trim() === '') {
        out.push(<br key={`br-${out.length}`} />);
        continue;
      }
      out.push(
        <p key={`p-${out.length}`} className="nv-chat-p">
          {renderInline(line, `p-${out.length}`)}
        </p>,
      );
    }
    flush();
  });
  return <>{out}</>;
}

function ChatImage({ id, filename }: { id: number; filename: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let obj: string | null = null;
    let dead = false;
    httpClient
      .get(`/chat/attachments/${id}`, { responseType: 'blob' })
      .then(({ data }) => {
        obj = URL.createObjectURL(data as Blob);
        if (!dead) setUrl(obj);
      })
      .catch(() => undefined);
    return () => {
      dead = true;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [id]);
  if (!url) return <span className="nv-chat-file">{filename}</span>;
  return <img src={url} alt={filename} className="nv-chat-img" />;
}

function fileIcon(filename: string) {
  const n = filename.toLowerCase();
  if (n.endsWith('.doc') || n.endsWith('.docx')) return <FileWordOutlined />;
  if (n.endsWith('.xls') || n.endsWith('.xlsx')) return <FileExcelOutlined />;
  if (n.endsWith('.ppt') || n.endsWith('.pptx')) return <FilePptOutlined />;
  if (n.endsWith('.pdf')) return <FilePdfOutlined />;
  return <FileOutlined />;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatFileChip({
  id,
  filename,
  image,
  sizeBytes,
}: {
  id: number;
  filename: string;
  image: boolean;
  sizeBytes?: number;
}) {
  if (image) return <ChatImage id={id} filename={filename} />;
  const download = async () => {
    const { data } = await httpClient.get(`/chat/attachments/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      className="nv-chat-file-card"
      onClick={() => void download()}
      title={filename}
    >
      <span className="nv-chat-file-card__icon">{fileIcon(filename)}</span>
      <span className="nv-chat-file-card__meta">
        <span className="nv-cell-line">{filename}</span>
        {typeof sizeBytes === 'number' ? (
          <span className="nv-chat-file-card__size">{formatBytes(sizeBytes)}</span>
        ) : null}
      </span>
    </button>
  );
}

export function ChatBody({ body }: { body: string }) {
  if (!body) return null;
  return <div className="nv-chat-md">{renderBlocks(body)}</div>;
}

export function UnfurlCards({
  links,
}: {
  links: { kind: string; href: string; code: string; title?: string; status?: string }[];
}) {
  if (!links?.length) return null;
  return (
    <div className="nv-chat-unfurls">
      {links.map((l) => {
        const label = l.title ? `${l.code} — ${l.title}` : l.code;
        return (
          <Link
            key={`${l.kind}-${l.code}`}
            to={l.href}
            className="nv-chat-unfurl"
            title={label}
          >
            <strong className="nv-cell-line">{l.code}</strong>
            {l.title ? <span className="nv-cell-line">{l.title}</span> : null}
            {l.status ? <em>{l.status.replaceAll('_', ' ')}</em> : null}
          </Link>
        );
      })}
    </div>
  );
}
