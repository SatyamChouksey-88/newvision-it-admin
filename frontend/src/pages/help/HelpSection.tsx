import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Col, Input, Layout, Menu, Row, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import {
  HELP_CATEGORIES,
  helpArticles,
  findArticle,
  searchArticles,
  type HelpArticle,
} from '../../help/articles';
import { COLOR_ACCENT, COLOR_BORDER } from '../../theme';

function readMinutes(body: string) {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 180));
}

function ArticleView({ article }: { article: HelpArticle }) {
  const [vote, setVote] = useState<string | null>(() =>
    localStorage.getItem(`nv:help-vote:${article.id}`),
  );
  const voteOn = (v: 'yes' | 'no') => {
    localStorage.setItem(`nv:help-vote:${article.id}`, v);
    setVote(v);
  };

  const steps = [...article.body.matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[1]);
  const hasWarning = /cannot|blocked|never deleted|must not/i.test(article.body);

  return (
    <article>
      <div className="nv-help-article-eyebrow">{article.category}</div>
      <Typography.Title level={3} style={{ margin: '6px 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
        {article.title}
      </Typography.Title>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Updated Sep 2026 · {readMinutes(article.body)} min read
      </Typography.Text>
      <Typography.Paragraph style={{ marginTop: 12, color: '#595959' }}>{article.summary}</Typography.Paragraph>

      {article.screenshot && (
        <figure
          style={{
            margin: '16px 0',
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
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

      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {article.body.replace(/^## /gm, '').replace(/\*\*/g, '')}
      </Typography.Paragraph>

      {steps.length > 0 && (
        <div>
          <Typography.Text strong style={{ fontSize: 13 }}>
            Steps
          </Typography.Text>
          <ol className="nv-help-steps">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      {hasWarning && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            color: '#B91C1C',
            fontSize: 12.5,
          }}
        >
          Some actions in this article are irreversible or role-gated. Check the warning notes in
          the body before you proceed.
        </div>
      )}

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
  );
}

function HelpHome() {
  const cards = HELP_CATEGORIES.map((cat) => ({
    category: cat,
    articles: helpArticles.filter((a) => a.category === cat),
  })).filter((g) => g.articles.length > 0);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3} className="nv-page-title" style={{ margin: 0 }}>
          Help & Documentation
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Guides for every NewVision feature — search the sidebar or pick a topic below.
        </Typography.Paragraph>
      </div>
      {cards.map(({ category, articles }) => (
        <div key={category}>
          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            {category}
          </Typography.Title>
          <Row gutter={[12, 12]}>
            {articles.map((a) => (
              <Col xs={24} sm={12} lg={8} key={a.id}>
                <Link to={`/help/${a.id}`} style={{ textDecoration: 'none' }}>
                  <Card size="small" hoverable className="nv-card-interactive" style={{ height: '100%' }}>
                    <Typography.Text strong style={{ color: '#1F1F1F' }}>
                      {a.title}
                    </Typography.Text>
                    <Typography.Paragraph
                      type="secondary"
                      style={{ fontSize: 12, marginBottom: 0, marginTop: 4 }}
                    >
                      {a.summary}
                    </Typography.Paragraph>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </Space>
  );
}

function HelpArticleRoute() {
  const { id } = useParams();
  const article = id ? findArticle(id) : undefined;
  if (!article) return <Navigate to="/help" replace />;
  return <ArticleView article={article} />;
}

export function HelpSection() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const results = useMemo(() => searchArticles(q), [q]);

  const menuItems = HELP_CATEGORIES.flatMap((cat) => {
    const items = helpArticles.filter((a) => a.category === cat);
    if (!items.length) return [];
    return [
      { type: 'group' as const, label: cat, children: items.map((a) => ({ key: a.id, label: a.title })) },
    ];
  });

  return (
    <Layout className="nv-help-layout" style={{ background: 'transparent', minHeight: 'calc(100vh - 120px)' }}>
      <Layout.Sider
        width={260}
        theme="light"
        style={{
          borderRight: `1px solid ${COLOR_BORDER}`,
          background: '#fff',
          position: 'sticky',
          top: 72,
          height: 'calc(100vh - 88px)',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: 16 }}>
          <Space>
            <BookOutlined style={{ color: COLOR_ACCENT }} />
            <Typography.Text strong>Documentation</Typography.Text>
          </Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search help…"
            allowClear
            aria-label="Search help articles"
            style={{ marginTop: 12 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPressEnter={() => {
              if (results[0]) navigate(`/help/${results[0].id}`);
            }}
          />
          {q.trim() && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {results.slice(0, 8).map((a) => (
                <div key={a.id}>
                  <Link to={`/help/${a.id}`} onClick={() => setQ('')}>
                    {a.title}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={[]}
          onClick={({ key }) => navigate(`/help/${key}`)}
          style={{ border: 'none' }}
        />
      </Layout.Sider>
      <Layout.Content style={{ padding: '0 24px 24px', maxWidth: 900 }}>
        <Routes>
          <Route index element={<HelpHome />} />
          <Route path=":id" element={<HelpArticleRoute />} />
        </Routes>
      </Layout.Content>
    </Layout>
  );
}
