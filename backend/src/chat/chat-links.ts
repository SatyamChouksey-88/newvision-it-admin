export type ChatLinkKind = 'ticket' | 'asset' | 'employee';

export interface ChatLinkRef {
  kind: ChatLinkKind;
  href: string;
  code: string;
  id?: number;
  title?: string;
  status?: string;
}

/** Detect TCK / AST / EMP codes and in-app show URLs inside a chat body. */
export function parseChatLinks(body: string): ChatLinkRef[] {
  const found: ChatLinkRef[] = [];
  const seen = new Set<string>();
  const add = (ref: ChatLinkRef) => {
    const key = `${ref.kind}:${ref.code}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push(ref);
  };

  for (const m of body.matchAll(/TCK-(\d{1,8})/gi)) {
    const id = Number(m[1]);
    add({ kind: 'ticket', code: `TCK-${String(id).padStart(6, '0')}`, href: `/tickets/show/${id}`, id });
  }
  for (const m of body.matchAll(/\/tickets\/show\/(\d+)/gi)) {
    const id = Number(m[1]);
    add({ kind: 'ticket', code: `TCK-${String(id).padStart(6, '0')}`, href: `/tickets/show/${id}`, id });
  }
  for (const m of body.matchAll(/\b(AST-[A-Z0-9-]+)\b/gi)) {
    add({ kind: 'asset', code: m[1].toUpperCase(), href: `/assets?q=${encodeURIComponent(m[1])}` });
  }
  for (const m of body.matchAll(/\/assets\/show\/(\d+)/gi)) {
    add({ kind: 'asset', code: `Asset #${m[1]}`, href: `/assets/show/${m[1]}`, id: Number(m[1]) });
  }
  for (const m of body.matchAll(/\b(EMP-[A-Z0-9-]+)\b/gi)) {
    add({ kind: 'employee', code: m[1].toUpperCase(), href: `/employees?q=${encodeURIComponent(m[1])}` });
  }
  for (const m of body.matchAll(/\/employees\/show\/(\d+)/gi)) {
    add({ kind: 'employee', code: `Employee #${m[1]}`, href: `/employees/show/${m[1]}`, id: Number(m[1]) });
  }
  return found;
}
