import { ArrowLeftOutlined, MenuOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { findArticle } from '../../help/articles';
import { extractHeadings, parseMarkdown } from '../../help/markdown';
import { COLOR_BORDER, COLOR_TEXT_MUTED, FONT_MONO } from '../../theme';
import { ArticleBody } from './ArticleBody';
import { HelpHome } from './HelpHome';
import { NavTree } from './NavTree';
import { SearchOverlay } from './SearchOverlay';
import { TableOfContents } from './TableOfContents';

function readMinutes(body: string) {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 180));
}

function ArticleRoute() {
  const { id } = useParams();
  const { hash, key: locationKey } = useLocation();
  const article = id ? findArticle(id) : undefined;

  // All hooks run unconditionally (React's rules of hooks) — the "not found" redirect happens
  // after, in the render return, never before a hook call.
  const blocks = useMemo(() => (article ? parseMarkdown(article.body) : []), [article]);
  const headings = useMemo(() => extractHeadings(blocks), [blocks]);
  const [vote, setVote] = useState<string | null>(null);

  useEffect(() => {
    setVote(article ? localStorage.getItem(`nv:help-vote:${article.id}`) : null);
  }, [article]);

  useEffect(() => {
    // Referencing locationKey (unique per navigation) makes this effect re-run on every article
    // change, not just when the hash changes — e.g. navigating between two hash-less articles.
    void locationKey;
    if (hash) {
      // Wait a tick for the article body to mount before scrolling to the anchor.
      const t = setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
      }, 30);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [hash, locationKey]);

  if (!article) return <Navigate to="/help" replace />;

  const voteOn = (v: 'yes' | 'no') => {
    localStorage.setItem(`nv:help-vote:${article.id}`, v);
    setVote(v);
  };

  return (
    <div className="nv-doc-article-grid">
      <article style={{ minWidth: 0, maxWidth: 720 }}>
        <div className="nv-help-article-eyebrow">{article.category}</div>
        <h1 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{article.title}</h1>
        <div style={{ fontSize: 12, color: COLOR_TEXT_MUTED, fontFamily: FONT_MONO }}>
          {readMinutes(article.body)} min read
        </div>
        <p style={{ marginTop: 12, color: '#595959', fontSize: 14 }}>{article.summary}</p>

        {article.screenshot && (
          <figure style={{ margin: '16px 0', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            <img
              src={article.screenshot}
              alt={article.title}
              style={{ width: '100%', display: 'block', background: '#fafafa', minHeight: 120 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {article.callouts?.length ? (
              <figcaption style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>
                {article.callouts.map((c) => (
                  <div key={c.n} style={{ marginBottom: 4 }}>
                    <strong>{c.n}.</strong> {c.label}
                  </div>
                ))}
              </figcaption>
            ) : null}
          </figure>
        )}

        <ArticleBody blocks={blocks} />

        <div className="nv-help-footer">
          <span>Was this helpful?</span>
          <Button size="small" type={vote === 'yes' ? 'primary' : 'default'} onClick={() => voteOn('yes')}>
            Yes
          </Button>
          <Button size="small" type={vote === 'no' ? 'primary' : 'default'} onClick={() => voteOn('no')}>
            No
          </Button>
          {vote ? <span>Thanks — we recorded your feedback on this device.</span> : null}
        </div>
      </article>
      <aside className="nv-help-toc-desktop">
        <TableOfContents headings={headings} />
      </aside>
    </div>
  );
}

function HelpHomeRoute() {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return <HelpHome />;
}

/**
 * Full-page documentation shell modeled on MkDocs Material (ing-bank.github.io/ingenious-doc):
 * fixed header with skip-link + search, a collapsible multi-level nav tree on the left, an
 * auto-generated table of contents on the right, and NewVision's own light design tokens
 * throughout (not the reference site's colors).
 */
export function HelpSection() {
  const { pathname } = useLocation();
  const activeId = pathname.startsWith('/help/') ? pathname.slice('/help/'.length) : undefined;
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="nv-doc-shell">
      <a href="#nv-doc-main" className="nv-skip-link">
        Skip to content
      </a>

      <header className="nv-doc-header">
        <button
          type="button"
          className="nv-doc-nav-toggle"
          aria-label="Open navigation"
          onClick={() => setNavOpen(true)}
        >
          <MenuOutlined />
        </button>
        <Link to="/help" className="nv-doc-brand">
          <img src="/brand/favicon.png" alt="" className="nv-brand-img" style={{ height: 22, width: 22 }} />
          <span>NewVision Docs</span>
        </Link>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="nv-doc-search-trigger"
          aria-label="Search the docs"
          onClick={() => setSearchOpen(true)}
        >
          <SearchOutlined />
          <span>Search the docs…</span>
          <span className="nv-kbd" style={{ fontFamily: FONT_MONO }}>⌘K</span>
        </button>
        <Link to="/" className="nv-doc-back-link">
          <ArrowLeftOutlined /> Back to app
        </Link>
      </header>

      <div className="nv-doc-body">
        <div className="nv-doc-sider-desktop">
          <NavTree activeId={activeId} />
        </div>
        <Drawer
          placement="left"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          title="Documentation"
          width={280}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <NavTree activeId={activeId} onNavigate={() => setNavOpen(false)} />
        </Drawer>

        <main id="nv-doc-main" className="nv-doc-main" tabIndex={-1}>
          <Routes>
            <Route index element={<HelpHomeRoute />} />
            <Route path=":id" element={<ArticleRoute />} />
          </Routes>
        </main>
      </div>

      <footer className="nv-doc-footer">Created and maintained by the NewVision IT team.</footer>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
