export const CURRENCY_SYMBOL = 'د.ع';

export function formatPrice(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return `0 ${CURRENCY_SYMBOL}`;
  const n = Number(amount);
  return Number.isFinite(n) ? `${n} ${CURRENCY_SYMBOL}` : `0 ${CURRENCY_SYMBOL}`;
}

export const fonts = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extraBold: 'Cairo_800ExtraBold',
  black: 'Cairo_900Black',
} as const;

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, screenPadding: 20 };
const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };

export const theme = {
  fonts,
  colors: {
    // Brand (vibrant)
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primarySoft: '#DBEAFE',
    primaryLight: '#93C5FD',
    accentPurple: '#7C3AED',
    accentPink: '#EC4899',
    accentAmber: '#F59E0B',
    info: '#0EA5E9',
    white: '#ffffff',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#F1F5F9',
    border: '#e2e8f0',
    borderLight: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    success: '#22c55e',
    warning: '#F59E0B',
    error: '#ef4444',
    overlay: 'rgba(15, 23, 42, 0.55)',
  },
  spacing,
  radius,
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
  },
};
