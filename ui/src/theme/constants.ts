export const colors = {
    // Primary colors - Dark gray like VoiceKit
    primary: '#1F2937',      // Dark gray for primary buttons and text
    primaryLight: '#374151', // Lighter gray for hover states
    primaryDark: '#111827',  // Darker gray for pressed states
    primaryBackground: '#F9FAFB', // Very light gray for backgrounds
    
    // Accent colors - Your brand purple
    accent: '#7A4988',       // Your original brand purple
    accentLight: '#8B5CF6',  // Lighter purple
    accentDark: '#6B3F7B',   // Darker purple
    accentBackground: '#F3E8FF', // Very light purple for backgrounds
    
    // Legacy colors (for backward compatibility)
    secondary: '#6B7280',    // Medium gray
    
    // Text colors - Sharper contrast like Clerk
    textPrimary: '#09090B',   // Almost black for main text (crisper)
    textSecondary: '#71717A', // Medium gray for secondary text
    textLight: '#ffffff',     // White text
    textMuted: '#A1A1AA',     // Light gray for disabled/muted
    
    // Neutral colors - Crisper gray scale like Clerk
    gray: {
        50: '#FAFAFA',
        100: '#F4F4F5',
        200: '#E4E4E7',
        300: '#D4D4D8',
        400: '#A1A1AA',
        500: '#71717A',
        600: '#52525B',
        700: '#3F3F46',
        800: '#27272A',
        900: '#18181B',
    },
    
    // UI colors
    background: '#FAFAFA',    // Soft off-white background
    surface: '#FFFFFF',       // Pure white for cards/surfaces
    border: '#E5E5E5',       // Clerk-style light border
    divider: '#F3F4F6',      // Even lighter for dividers
    
    // Semantic colors - Updated to be more modern
    error: '#EF4444',        // Softer red
    errorLight: '#FEE2E2',   // Light red background
    success: '#10B981',      // Modern green
    successLight: '#D1FAE5', // Light green background
    warning: '#F59E0B',      // Warm amber
    warningLight: '#FEF3C7', // Light amber background
    info: '#3B82F6',         // Bright blue
    infoLight: '#DBEAFE',    // Light blue background

    // Specific component colors
    headerBorder: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.05)', // For modern shadows
};

export const typography = {
    // Font families - Using Inter for web
    fontFamily: {
        // Primary font - Inter for that clean, modern look
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },

    // Font sizes - Tighter scale for crispness
    fontSize: {
        xs: '0.6875rem',   // 11px
        sm: '0.8125rem',   // 13px
        base: '0.875rem',  // 14px
        lg: '1rem',        // 16px
        xl: '1.125rem',    // 18px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
        '6xl': '3.75rem',  // 60px
    },
    
    // Font weights
    fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
    },
    
    // Line heights
    lineHeight: {
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
    },
};