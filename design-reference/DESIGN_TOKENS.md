# NewVision Design Tokens (extracted from `NewVision_Asset_Manager.html`)

Source: Claude Design bundled export, rendered thumbnail + embedded CSS color audit.  
**This file supersedes Prompt 3/6 theme notes where they conflict.**

## Canvas & surfaces

| Token | Value | Usage |
|-------|-------|--------|
| `canvas` | `#F8FAFC` | Page background (`colorBgLayout`) |
| `surface` | `#FFFFFF` | Cards, sidebar, header |
| `surfaceMuted` | `#F1F4F8` | KPI metric tiles |
| `surfaceHover` | `#F1F5F9` | Table row hover, menu hover |

## Text

| Token | Value | Usage |
|-------|-------|--------|
| `textPrimary` | `#1F1F1F` | Headings, values, primary labels |
| `textSecondary` | `#475569` | Subtitles, table body (13px) |
| `textMuted` | `#64748B` | KPI labels, metadata (12px) |
| `textPlaceholder` | `#94A3B8` | Input placeholders |
| `textDisabled` | `#CBD5E1` | Disabled controls |

## Accent & links

| Token | Value | Usage |
|-------|-------|--------|
| `primary` | `#0958D9` | Buttons, links, active nav (WCAG AA 6.16:1 on white) |
| `primaryHover` | `#1677FF` | Hover only |
| `primaryBg` | `#F0F7FF` | Selected nav item background |
| `primaryBgHover` | `#D6E8FF` | Nav hover |

## Borders & radius

| Token | Value |
|-------|-------|
| `border` | `#E9EDF2` |
| `borderSecondary` | `#E2E8F0` |
| `radiusSm` | `6px` |
| `radiusMd` | `10px` |
| `radiusLg` | `16px` |

## Shadows

| Token | Value |
|-------|-------|
| `shadowRaised` | `0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)` |
| `shadowFloating` | `0 4px 12px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)` |

## Status / KPI accent bars

| Status | Bar color | Value tint |
|--------|-----------|------------|
| Assigned / success | `#16A34A` | `#15803D` |
| Under repair / warning | `#D97706` | `#B45309` |
| Total / info | `#0958D9` | `#0958D9` |
| Available / neutral | `#64748B` | `#475569` |
| Retired | `#475569` | `#475569` |
| Warranty / danger | `#DC2626` | `#B91C1C` |

## Typography

- **Font:** Inter (400/500/600), fallback system stack
- **Base:** 14px / 400
- **Page title:** 24px / 600
- **Section title:** 16px / 600
- **Table body:** 13px
- **Secondary / metadata:** 12px (minimum; no 11px body text)

## KPI card (signature element)

```
┌─────────────────────────┐
│ ████ 4px accent bar     │
│ LABEL (12px muted)   icon│
│ 1,250 (28px semibold)   │
│ optional sparkline      │
└─────────────────────────┘
Background: #F1F4F8, radius 10px, border #E9EDF2
Outer cards: white, radius 16px, border #E9EDF2, shadow raised
```

## Sidebar

- Width: 220px (collapsible)
- Background: `#FFFFFF`
- Active: `#F0F7FF` bg + `#0958D9` text
- Icons: Ant Design outlined set (semantic, not unicode glyphs)
