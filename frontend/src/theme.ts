import type { ThemeConfig } from 'antd';

/** Approved mockup tokens — see design-reference/DESIGN_TOKENS.md */

export const COLOR_CANVAS = '#F8FAFC';
export const COLOR_SURFACE = '#FFFFFF';
export const COLOR_SURFACE_MUTED = '#F1F4F8';
export const COLOR_BORDER = '#E9EDF2';
export const COLOR_BORDER_SECONDARY = '#E2E8F0';

export const COLOR_TEXT_PRIMARY = '#1F1F1F';
export const COLOR_TEXT_SECONDARY = '#475569';
export const COLOR_TEXT_MUTED = '#64748B';
export const COLOR_TEXT_PLACEHOLDER = '#94A3B8';
export const COLOR_TEXT_DISABLED = '#CBD5E1';

/** WCAG AA link/accent — #0958D9 (6.16:1 on white), not #1677FF */
export const COLOR_ACCENT = '#0958D9';
export const COLOR_ACCENT_HOVER = '#1677FF';
export const COLOR_ACCENT_BG = '#F0F7FF';
export const COLOR_ACCENT_BG_HOVER = '#D6E8FF';

export const SHADOW_RAISED = '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)';
export const SHADOW_FLOATING =
  '0 4px 12px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)';

export const RADIUS_SM = 6;
export const RADIUS_MD = 10;
export const RADIUS_LG = 16;

/** KPI / status accent bar colors from mockup */
export const KPI_ASSIGNED = '#16A34A';
export const KPI_AVAILABLE = '#64748B';
export const KPI_REPAIR = '#D97706';
export const KPI_TOTAL = '#0958D9';
export const KPI_RETIRED = '#475569';
export const KPI_WARRANTY = '#DC2626';

export const newVisionTheme: ThemeConfig = {
  token: {
    colorPrimary: COLOR_ACCENT,
    colorLink: COLOR_ACCENT,
    colorLinkHover: COLOR_ACCENT_HOVER,
    colorLinkActive: '#003EB3',
    colorError: '#DC2626',
    colorErrorHover: '#B91C1C',
    colorSuccess: KPI_ASSIGNED,
    colorWarning: KPI_REPAIR,
    borderRadius: RADIUS_SM,
    borderRadiusLG: RADIUS_LG,
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    colorText: COLOR_TEXT_PRIMARY,
    colorTextSecondary: COLOR_TEXT_SECONDARY,
    colorTextTertiary: COLOR_TEXT_MUTED,
    colorTextQuaternary: COLOR_TEXT_DISABLED,
    colorTextPlaceholder: COLOR_TEXT_PLACEHOLDER,
    colorBorder: COLOR_BORDER,
    colorBorderSecondary: COLOR_BORDER_SECONDARY,
    boxShadow: SHADOW_FLOATING,
    boxShadowSecondary: SHADOW_RAISED,
    boxShadowTertiary: SHADOW_RAISED,
    colorBgLayout: COLOR_CANVAS,
    colorBgContainer: COLOR_SURFACE,
    colorBgElevated: COLOR_SURFACE,
    lineHeight: 1.5,
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: COLOR_SURFACE,
      headerBg: COLOR_SURFACE,
      bodyBg: COLOR_CANVAS,
      triggerBg: COLOR_SURFACE,
    },
    Menu: {
      itemBg: COLOR_SURFACE,
      itemColor: COLOR_TEXT_SECONDARY,
      itemHoverBg: '#F1F5F9',
      itemHoverColor: COLOR_TEXT_PRIMARY,
      itemSelectedBg: COLOR_ACCENT_BG,
      itemSelectedColor: COLOR_ACCENT,
      itemActiveBg: COLOR_ACCENT_BG,
      iconSize: 16,
      itemHeight: 40,
      fontSize: 13,
    },
    Card: {
      borderRadiusLG: RADIUS_LG,
      boxShadow: SHADOW_RAISED,
      boxShadowTertiary: SHADOW_RAISED,
      colorBorderSecondary: COLOR_BORDER,
      paddingLG: 20,
    },
    Table: {
      cellPaddingBlock: 10,
      cellPaddingBlockSM: 8,
      cellPaddingInline: 12,
      cellFontSize: 13,
      cellFontSizeSM: 13,
      headerBg: COLOR_SURFACE,
      headerColor: '#334155',
      headerSortActiveBg: COLOR_ACCENT_BG,
      rowHoverBg: '#F1F5F9',
      borderColor: COLOR_BORDER,
    },
    Button: {
      borderRadius: RADIUS_SM,
      controlHeight: 36,
      fontWeight: 500,
      colorError: '#DC2626',
      colorErrorHover: '#B91C1C',
      colorErrorActive: '#991B1B',
    },
    Input: {
      borderRadius: RADIUS_SM,
      colorBorder: COLOR_BORDER,
      activeBorderColor: COLOR_ACCENT,
      hoverBorderColor: COLOR_BORDER_SECONDARY,
    },
    Select: {
      borderRadius: RADIUS_SM,
    },
    Tag: {
      borderRadiusSM: 4,
      defaultBg: '#F1F5F9',
      defaultColor: COLOR_TEXT_SECONDARY,
    },
    Modal: {
      borderRadiusLG: RADIUS_LG,
      boxShadow: SHADOW_FLOATING,
    },
    Dropdown: {
      boxShadowSecondary: SHADOW_FLOATING,
    },
    Popover: {
      boxShadowSecondary: SHADOW_FLOATING,
    },
    Drawer: {
      boxShadow: SHADOW_FLOATING,
    },
    Tabs: {
      itemColor: COLOR_TEXT_MUTED,
      itemSelectedColor: COLOR_ACCENT,
      itemHoverColor: COLOR_TEXT_PRIMARY,
      inkBarColor: COLOR_ACCENT,
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
  },
};

export const tabularNums: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

export const MUTED_TEXT = COLOR_TEXT_MUTED;

/** Minimum 12px for readable secondary text (mockup + a11y pass). */
export const mutedSubtext: React.CSSProperties = {
  fontSize: 12,
  color: COLOR_TEXT_SECONDARY,
  lineHeight: 1.4,
};

export const raisedCardStyle: React.CSSProperties = {
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: RADIUS_LG,
  boxShadow: SHADOW_RAISED,
  background: COLOR_SURFACE,
};
