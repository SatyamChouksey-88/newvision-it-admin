import { RightOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { HELP_CATEGORIES, helpArticles, type HelpArticle } from '../../help/articles';
import { COLOR_ACCENT_BG, COLOR_LINK, COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY } from '../../theme';

interface CategoryNode {
  category: string;
  direct: HelpArticle[];
  groups: { name: string; articles: HelpArticle[] }[];
}

function buildTree(): CategoryNode[] {
  return HELP_CATEGORIES.map((category) => {
    const items = helpArticles.filter((a) => a.category === category);
    const direct = items.filter((a) => !a.group);
    const groupNames = [...new Set(items.filter((a) => a.group).map((a) => a.group!))];
    return {
      category,
      direct,
      groups: groupNames.map((name) => ({ name, articles: items.filter((a) => a.group === name) })),
    };
  }).filter((n) => n.direct.length > 0 || n.groups.length > 0);
}

const TREE = buildTree();

/**
 * Multi-level collapsible nav tree (MkDocs Material pattern): top-level sections expand/collapse,
 * an optional second level groups related articles, the current page is highlighted, and the
 * section containing it is expanded by default.
 */
export function NavTree({ activeId, onNavigate }: { activeId?: string; onNavigate?: () => void }) {
  const activeCategory = TREE.find(
    (n) => n.direct.some((a) => a.id === activeId) || n.groups.some((g) => g.articles.some((a) => a.id === activeId)),
  )?.category;
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(activeCategory ? [activeCategory] : [TREE[0]?.category]),
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const g = TREE.flatMap((n) => n.groups).find((gr) => gr.articles.some((a) => a.id === activeId));
    return new Set(g ? [g.name] : []);
  });

  useEffect(() => {
    if (activeCategory) setOpenCategories((prev) => new Set(prev).add(activeCategory));
  }, [activeCategory]);

  const toggleCategory = (cat: string) =>
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <nav aria-label="Documentation sections" className="nv-doc-nav">
      <Link
        to="/help"
        onClick={onNavigate}
        className="nv-doc-nav-item"
        style={
          !activeId
            ? { background: COLOR_ACCENT_BG, color: COLOR_LINK, fontWeight: 500, marginBottom: 6 }
            : { color: COLOR_TEXT_SECONDARY, marginBottom: 6 }
        }
      >
        Home
      </Link>
      {TREE.map((node) => {
        const isOpen = openCategories.has(node.category);
        return (
          <div key={node.category} style={{ marginBottom: 2 }}>
            <button
              type="button"
              className="nv-doc-nav-section"
              onClick={() => toggleCategory(node.category)}
              aria-expanded={isOpen}
            >
              <RightOutlined
                style={{
                  fontSize: 9,
                  color: COLOR_TEXT_MUTED,
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
              {node.category}
            </button>
            {isOpen && (
              <div style={{ paddingLeft: 18 }}>
                {node.direct.map((a) => (
                  <Link
                    key={a.id}
                    to={`/help/${a.id}`}
                    onClick={onNavigate}
                    className="nv-doc-nav-item"
                    style={
                      a.id === activeId
                        ? { background: COLOR_ACCENT_BG, color: COLOR_LINK, fontWeight: 500 }
                        : { color: COLOR_TEXT_SECONDARY }
                    }
                  >
                    {a.title}
                  </Link>
                ))}
                {node.groups.map((group) => {
                  const groupOpen = openGroups.has(group.name);
                  return (
                    <div key={group.name}>
                      <button
                        type="button"
                        className="nv-doc-nav-group"
                        onClick={() => toggleGroup(group.name)}
                        aria-expanded={groupOpen}
                      >
                        <RightOutlined
                          style={{
                            fontSize: 8,
                            color: COLOR_TEXT_MUTED,
                            transform: groupOpen ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                        {group.name}
                      </button>
                      {groupOpen && (
                        <div style={{ paddingLeft: 16 }}>
                          {group.articles.map((a) => (
                            <Link
                              key={a.id}
                              to={`/help/${a.id}`}
                              onClick={onNavigate}
                              className="nv-doc-nav-item"
                              style={
                                a.id === activeId
                                  ? { background: COLOR_ACCENT_BG, color: COLOR_LINK, fontWeight: 500 }
                                  : { color: COLOR_TEXT_SECONDARY }
                              }
                            >
                              {a.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
