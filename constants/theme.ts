/**
 * Purple theme palette: light (white/off-white) and dark (soft gray).
 * Used by ThemeContext and throughout the app for consistent styling.
 */

import { Platform } from 'react-native';

const purple = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  primaryLight: '#a78bfa',
};

/** Light mode: white/off-white background with purple accents */
export const PurpleThemeLight = {
  ...purple,
  background: '#faf9ff',
  surface: '#ffffff',
  card: '#f5f3ff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#eab308',
};

/** Dark mode: soft dark gray (not black) with purple accents */
export const PurpleThemeDark = {
  ...purple,
  background: '#2d2d3d',
  surface: '#3d3d52',
  card: '#454560',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  border: '#4f4f64',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#eab308',
};

/** @deprecated Use PurpleThemeLight or PurpleThemeDark via useAppTheme */
export const PurpleTheme = PurpleThemeDark;

const tintColorLight = purple.primary;
const tintColorDark = purple.primaryLight;

export const Colors = {
  light: {
    text: PurpleThemeLight.text,
    background: PurpleThemeLight.background,
    tint: tintColorLight,
    icon: PurpleThemeLight.textSecondary,
    tabIconDefault: PurpleThemeLight.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: PurpleThemeDark.text,
    background: PurpleThemeDark.background,
    tint: tintColorDark,
    icon: PurpleThemeDark.textSecondary,
    tabIconDefault: PurpleThemeDark.textSecondary,
    tabIconSelected: tintColorDark,
  },
};

/** Static fallback - use useAppTheme() for scheme-aware colors in screens. */
export const AppColors = PurpleThemeLight;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
