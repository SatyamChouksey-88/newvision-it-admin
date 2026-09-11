import type { ThemeConfig } from 'antd';

/** Approved mockup tokens — see design-reference/DESIGN_TOKENS.md */

export const COLOR_CANVAS = '#F8FAFC';
export const COLOR_SURFACE = '#FFFFFF';
export const COLOR_SURFACE_MUTED = '#F1F4F8';
/** Visible card/table outline on #F8FAFC — slightly stronger than the mockup hairline. */
export const COLOR_BORDER = '#D5DEE8';
export const COLOR_BORDER_SECONDARY = '#E2E8F0';

export const COLOR_TEXT_PRIMARY = '#1F1F1F';
export const COLOR_TEXT_SECONDARY = '#595959';
export const COLOR_TEXT_MUTED = '#475569';
export const COLOR_TEXT_PLACEHOLDER = '#475569';
export const COLOR_TEXT_DISABLED = '#CBD5E1';

/** Buttons/KPI use #1677FF; links use #0958D9 so body text stays WCAG AA. */
export const COLOR_ACCENT = '#1677FF';
export const COLOR_ACCENT_HOVER = '#0958D9';
export const COLOR_LINK = '#0958D9';
export const COLOR_ACCENT_BG = '#F0F7FF';
export const COLOR_ACCENT_BG_HOVER = '#D6E8FF';
export const COLOR_SELECTED_ROW = '#F5FAFF';
export const COLOR_INPUT_BORDER = '#C9D3DF';
export const COLOR_TABLE_HEADER = '#EEF4FB';

export const SHADOW_RAISED = '0 2px 6px rgba(16, 24, 40, 0.06)';
export const SHADOW_FLOATING = '0 2px 6px rgba(16, 24, 40, 0.06)';

export const RADIUS_SM = 6;
export const RADIUS_MD = 8;
export const RADIUS_LG = 8;

/** KPI / status accent bar colors from mockup */
export const KPI_ASSIGNED = '#16A34A';
export const KPI_AVAILABLE = '#94A3B8';
export const KPI_REPAIR = '#D97706';
export const KPI_TOTAL = '#1677FF';
export const KPI_RETIRED = '#CBD5E1';
export const KPI_WARRANTY = '#DC2626';

export const newVisionTheme: ThemeConfig = {
  token: {
    colorPrimary: COLOR_ACCENT_HOVER,
    colorLink: COLOR_LINK,
    colorLinkHover: COLOR_ACCENT_HOVER,
    colorLinkActive: '#003EB3',
    colorError: '#DC2626',
    colorErrorHover: '#B91C1C',
    colorSuccess: KPI_ASSIGNED,
    colorWarning: KPI_REPAIR,
    borderRadius: RADIUS_SM,
    borderRadiusLG: RADIUS_LG,
    fontSize: 13,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontFamily: "'Inter', Helvetica, Arial, sans-serif",
    fontFamilyCode: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    colorText: COLOR_TEXT_PRIMARY,
    colorTextSecondary: COLOR_TEXT_SECONDARY,
    colorTextTertiary: COLOR_TEXT_MUTED,
    colorTextQuaternary: COLOR_TEXT_DISABLED,
    colorTextPlaceholder: COLOR_TEXT_PLACEHOLDER,
    colorBorder: COLOR_INPUT_BORDER,
    colorBorderSecondary: COLOR_BORDER,
    boxShadow: SHADOW_FLOATING,
    boxShadowSecondary: SHADOW_RAISED,
    boxShadowTertiary: SHADOW_RAISED,
    colorBgLayout: COLOR_CANVAS,
    colorBgContainer: COLOR_SURFACE,
    colorBgElevated: COLOR_SURFACE,
    lineHeight: 1.5,
    controlHeight: 30,
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
      itemSelectedColor: COLOR_LINK,
      itemActiveBg: COLOR_ACCENT_BG,
      iconSize: 16,
      itemHeight: 40,
      fontSize: 13,
    },
    Card: {
      borderRadiusLG: RADIUS_MD,
      boxShadow: 'none',
      boxShadowTertiary: 'none',
      colorBorderSecondary: COLOR_BORDER,
      paddingLG: 20,
    },
    Table: {
      cellPaddingBlock: 10,
      cellPaddingBlockSM: 8,
      cellPaddingInline: 12,
      cellFontSize: 13,
      cellFontSizeSM: 13,
      headerBg: COLOR_TABLE_HEADER,
      headerColor: '#1E3A5F',
      headerSortActiveBg: COLOR_ACCENT_BG,
      rowHoverBg: COLOR_SELECTED_ROW,
      borderColor: COLOR_BORDER,
    },
    Button: {
      borderRadius: RADIUS_SM,
      controlHeight: 30,
      fontWeight: 500,
      colorError: '#DC2626',
      colorErrorHover: '#B91C1C',
      colorErrorActive: '#991B1B',
    },
    Input: {
      borderRadius: RADIUS_SM,
      colorBorder: COLOR_INPUT_BORDER,
      activeBorderColor: COLOR_ACCENT,
      hoverBorderColor: '#91CAFF',
    },
    Select: {
      borderRadius: RADIUS_SM,
      colorBorder: COLOR_INPUT_BORDER,
      optionSelectedBg: COLOR_ACCENT_BG,
      optionActiveBg: COLOR_ACCENT_BG,
      selectorBg: COLOR_SURFACE_MUTED,
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

export const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export const tabularNums: React.CSSProperties = {
  fontFamily: FONT_MONO,
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
  borderRadius: RADIUS_MD,
  boxShadow: 'none',
  background: COLOR_SURFACE,
};

export const interactiveCardHover = {
  borderColor: '#C9D3DF',
  boxShadow: SHADOW_RAISED,
} as const;
