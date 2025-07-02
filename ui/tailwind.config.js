const { colors, typography } = require('./src/theme/constants');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette
        primary: {
          DEFAULT: colors.primary,
          light: colors.primaryLight,
          dark: colors.primaryDark,
          background: colors.primaryBackground,
        },
        // Accent palette
        accent: {
          DEFAULT: colors.accent,
          light: colors.accentLight,
          dark: colors.accentDark,
          background: colors.accentBackground,
        },
        // Gray scale
        gray: colors.gray,
        // Text colors
        text: {
          primary: colors.textPrimary,
          secondary: colors.textSecondary,
          light: colors.textLight,
          muted: colors.textMuted,
        },
        // UI colors
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        divider: colors.divider,
        // Semantic colors
        error: {
          DEFAULT: colors.error,
          light: colors.errorLight,
        },
        success: {
          DEFAULT: colors.success,
          light: colors.successLight,
        },
        warning: {
          DEFAULT: colors.warning,
          light: colors.warningLight,
        },
        info: {
          DEFAULT: colors.info,
          light: colors.infoLight,
        },
      },
      fontFamily: {
        sans: typography.fontFamily.sans,
        display: typography.fontFamily.display,
        mono: typography.fontFamily.mono,
      },
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      boxShadow: {
        'soft': `0 1px 3px 0 ${colors.shadow}, 0 1px 2px 0 ${colors.shadow}`,
        'medium': `0 4px 6px -1px ${colors.shadow}, 0 2px 4px -1px ${colors.shadow}`,
        'large': `0 10px 15px -3px ${colors.shadow}, 0 4px 6px -2px ${colors.shadow}`,
      },
    },
  },
  plugins: [],
}