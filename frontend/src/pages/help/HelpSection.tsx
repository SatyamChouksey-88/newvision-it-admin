import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import { Card, Col, Input, Layout, Menu, Row, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import {
  HELP_CATEGORIES,
  helpArticles,
  findArticle,
  searchArticles,
  type HelpArticle,
} from '../../help/articles';
import { COLOR_BORDER, SHADOW_RAISED } from '../../theme';

function ArticleView({ article }: { article: HelpArticle }) {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Text type="secondary">{article.category}</Typography.Text>
        <Typography.Title level={3} style={{ margin: '4px 0 0' }}>
          {article.title}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{article.summary}</Typography.Paragraph>
      </div>
      {article.screenshot && (
        <figure
          style={{
            margin: 0,
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: SHADOW_RAISED,
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
            <figcaption style={{ padding: '8px 12px', fontSize: 12, color: '#64748B' }}>
              {article.callouts.map((c) => (
                <span key={c.n} style={{ marginRight: 12 }}>
                  <strong>{c.n}.</strong> {c.label}
                </span>
              ))}
            </figcaption>
          ) : null}
          <figcaption style={{ padding: '4px 12px 8px', fontSize: 11, color: '#64748B' }}>
            Screenshot: {article.screenshot}. Run <code>npm run screenshots</code> in{' '}
            <code>frontend/</code> to capture if missing.
          </figcaption>
        </figure>
      )}
      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {article.body.replace(/^## /gm, '').replace(/\*\*/g, '')}
      </Typography.Paragraph>
    </Space>
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
        <Typography.Title level={4} style={{ margin: 0 }}>
          Help & Documentation
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Guides for every NewVision feature — search above or pick a topic below.
        </Typography.Paragraph>
      </div>
      {cards.map(({ category, articles }) => (
        <div key={category}>
          <Typography.Title level={5}>{category}</Typography.Title>
          <Row gutter={[16, 16]}>
            {articles.map((a) => (
              <Col xs={24} sm={12} lg={8} key={a.id}>
                <Link to={`/help/${a.id}`} style={{ textDecoration: 'none' }}>
                  <Card
                    size="small"
                    hoverable
                    style={{ border: `1px solid ${COLOR_BORDER}`, boxShadow: SHADOW_RAISED, height: '100%' }}
                  >
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
    <Layout style={{ background: 'transparent', minHeight: 'calc(100vh - 120px)' }}>
      <Layout.Sider
        width={260}
        theme="light"
        style={{
          borderRight: `1px solid ${COLOR_BORDER}`,
          background: '#fff',
          boxShadow: SHADOW_RAISED,
        }}
      >
        <div style={{ padding: 16 }}>
          <Space>
            <BookOutlined style={{ color: '#2f54eb' }} />
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
              {results.slice(0, 5).map((a) => (
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
