import { helpArticles, type HelpArticle } from './articles';
import { blocksToPlainText, extractHeadings, parseMarkdown } from './markdown';

export interface SearchEntry {
  articleId: string;
  articleTitle: string;
  /** The specific heading matched within the article, if any (for "matching sections within pages"). */
  headingSlug?: string;
  headingText?: string;
  /** Lowercased haystack for this entry, built once at index time. */
  haystack: string;
  snippet: string;
}

let index: SearchEntry[] | null = null;

/** Built once, lazily, from the same content model that renders the articles — no server round-trip. */
function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const a of helpArticles) {
    const blocks = parseMarkdown(a.body);
    const bodyText = blocksToPlainText(blocks);
    entries.push({
      articleId: a.id,
      articleTitle: a.title,
      haystack: [a.title, a.summary, a.keywords.join(' '), bodyText].join(' ').toLowerCase(),
      snippet: a.summary,
    });
    for (const h of extractHeadings(blocks)) {
      entries.push({
        articleId: a.id,
        articleTitle: a.title,
        headingSlug: h.slug,
        headingText: h.text,
        haystack: `${a.title} ${h.text}`.toLowerCase(),
        snippet: h.text,
      });
    }
  }
  return entries;
}

export interface SearchResult {
  article: HelpArticle;
  headingSlug?: string;
  headingText?: string;
  score: number;
}

/** Instant client-side search — titles rank above headings, headings above body-only matches. */
export function searchHelp(query: string, limit = 20): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (!index) index = buildIndex();

  const byArticle = new Map<string, HelpArticle>();
  for (const a of helpArticles) byArticle.set(a.id, a);

  const scored: SearchResult[] = [];
  const seenArticleOnly = new Set<string>();
  for (const entry of index) {
    if (!entry.haystack.includes(q)) continue;
    const article = byArticle.get(entry.articleId);
    if (!article) continue;
    let score = 0;
    if (article.title.toLowerCase().includes(q)) score += 100;
    if (entry.headingText?.toLowerCase().includes(q)) score += 40;
    if (!entry.headingText && article.summary.toLowerCase().includes(q)) score += 20;
    if (!entry.headingText) {
      if (seenArticleOnly.has(entry.articleId)) continue;
      seenArticleOnly.add(entry.articleId);
    }
    score += 1;
    scored.push({ article, headingSlug: entry.headingSlug, headingText: entry.headingText, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
