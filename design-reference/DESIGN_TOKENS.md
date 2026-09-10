# NewVision Design Tokens

Source of truth: `NewVision-standalone-src.html` (Prompt 12 / UI Design System Overview).  
Supersedes Prompt 3/6/9 written tokens wherever they conflict.

## Canvas & surfaces

| Token | Value |
|-------|--------|
| `canvas` | `#F8FAFC` |
| `surface` | `#FFFFFF` |
| `surfaceMuted` / estate panel | `#FAFAFA` / `#F1F4F8` |
| `selectedRow` | `#F5FAFF` |

## Text

| Token | Value | Notes |
|-------|-------|--------|
| `textPrimary` | `#1F1F1F` | |
| `textSecondary` | `#595959` | |
| `textMuted` | `#64748B` | |
| `textPlaceholder` | `#94A3B8` | |

## Accent

| Token | Value | Usage |
|-------|-------|--------|
| `accent` | `#1677FF` | Primary buttons, KPI Total bar |
| `accentHover` | `#0958D9` | Hover/active; **links** (WCAG AA 6.16:1) |
| `accentBg` | `#F0F7FF` | |
| `accentBorder` | `#D6E8FF` | |

## Borders & radius

| Token | Value |
|-------|-------|
| Card border | `#E9EDF2` |
| Input/button border | `#E4E9F0` |
| Dividers | `#F1F4F8` / `#F5F7FA` |
| Card radius | `8px` |
| Button/input radius | `5–6px` |
| Badge radius | `3–4px` |

## Elevation

- Default cards: 1px border, **no shadow**
- Hover/interactive: border `#C9D3DF` + `0 2px 6px rgba(16,24,40,0.06)`

## KPI bars

| Metric | Color |
|--------|--------|
| Total | `#1677FF` |
| Assigned | `#16A34A` |
| Available | `#94A3B8` |
| Under repair | `#D97706` |
| Retired | `#CBD5E1` |
| Warranty | `#DC2626` |

## Typography

- UI: Inter
- Mono (codes, serials, IDs, dates, numbers): JetBrains Mono + `tabular-nums`
- Page title: 24px / 600 / -0.02em
- Body: 12–13px

## Shell

- Sidebar: 216px
- Header: 52px
