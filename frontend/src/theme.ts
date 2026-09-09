import type { ThemeConfig } from 'antd';

/** Raised card shadow — static content surfaces. */
export const SHADOW_RAISED = '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)';

/** Floating layer shadow — modals, dropdowns, popovers, help panel. */
export const SHADOW_FLOATING =
  '0 4px 12px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)';

export const COLOR_BORDER = '#E2E8F0';
export const COLOR_TEXT_PRIMARY = '#1F1F1F';
export const COLOR_TEXT_SECONDARY = '#595959';
export const COLOR_TEXT_MUTED = '#64748B';
export const COLOR_TEXT_PLACEHOLDER = '#6B7280';
export const COLOR_TEXT_DISABLED = '#BFBFBF';
export const COLOR_ACCENT = '#2f54eb';

/**
 * Prompt 3 + 6: text hierarchy, depth/shadow tiers, single accent on interactive chrome.
 * Chart colors stay in chartColors.ts — not here.
 */
export const newVisionTheme: ThemeConfig = {
  token: {
    colorPrimary: COLOR_ACCENT,
    colorLink: '#1d39c4',
    colorLinkHover: '#10239e',
    colorError: '#cf1322',
    colorErrorHover: '#a8071a',
    borderRadius: 4,
    fontSize: 14,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    colorText: COLOR_TEXT_PRIMARY,
    colorTextSecondary: COLOR_TEXT_SECONDARY,
    colorTextTertiary: COLOR_TEXT_MUTED,
    colorTextQuaternary: COLOR_TEXT_DISABLED,
    colorTextPlaceholder: COLOR_TEXT_PLACEHOLDER,
    colorBorder: COLOR_BORDER,
    colorBorderSecondary: COLOR_BORDER,
    boxShadow: SHADOW_FLOATING,
    boxShadowSecondary: SHADOW_RAISED,
    boxShadowTertiary: SHADOW_RAISED,
    colorBgLayout: '#f5f6f8',
  },
  components: {
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      bodyBg: '#f5f6f8',
    },
    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: '#eef1ff',
      itemSelectedColor: COLOR_ACCENT,
    },
    Card: {
      boxShadow: SHADOW_RAISED,
      boxShadowTertiary: SHADOW_RAISED,
    },
    Table: {
      cellPaddingBlockSM: 4,
      headerBg: '#fafafa',
      headerSortActiveBg: '#eef1ff',
    },
    Button: {
      colorError: '#cf1322',
      colorErrorHover: '#a8071a',
      colorErrorActive: '#820014',
      colorErrorBorderHover: '#a8071a',
    },
    Modal: {
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
  },
};

export const tabularNums: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

export const MUTED_TEXT = COLOR_TEXT_MUTED;

/** 11px subtext must stay ≥4.5:1 on white — use secondary, not tertiary muted. */
export const mutedSubtext: React.CSSProperties = {
  fontSize: 11,
  color: COLOR_TEXT_SECONDARY,
  lineHeight: 1.3,
};

/** Card style for raised static surfaces. */
export const raisedCardStyle: React.CSSProperties = {
  border: `1px solid ${COLOR_BORDER}`,
  boxShadow: SHADOW_RAISED,
};
