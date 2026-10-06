/** Display currency for the Algeria-facing customer experience. Stored values stay untouched. */
export const CURRENCY_SYMBOL = 'دج';

export function formatPrice(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return `0 ${CURRENCY_SYMBOL}`;
  const n = Number(amount);
  // Algerian presentation uses grouped western digits with spaces, while stored
  // prices remain unchanged numeric values.
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} ${CURRENCY_SYMBOL}` : `0 ${CURRENCY_SYMBOL}`;
}

export const fonts = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semiBold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
  extraBold: 'IBMPlexSansArabic_700Bold',
  black: 'IBMPlexSansArabic_700Bold',
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 40, fontFamily: fonts.bold as string },
  titleLarge: { fontSize: 22, lineHeight: 30, fontFamily: fonts.bold as string },
  titleMedium: { fontSize: 18, lineHeight: 26, fontFamily: fonts.semiBold as string },
  body: { fontSize: 16, lineHeight: 25, fontFamily: fonts.regular as string },
  bodyMedium: { fontSize: 16, lineHeight: 25, fontFamily: fonts.medium as string },
  caption: { fontSize: 13, lineHeight: 20, fontFamily: fonts.regular as string },
  captionMedium: { fontSize: 13, lineHeight: 20, fontFamily: fonts.medium as string },
} as const;

export type Theme = {
  fonts: typeof fonts;
  typography: typeof typography;
  colors: {
    primary: string; primaryDark: string; primarySoft: string; apricot: string; peach: string;
    white: string; background: string; backgroundSecondary: string; surface: string;
    surfaceElevated: string; glass: string; glassBorder: string; highlight: string;
    border: string; borderLight: string; text: string; textSecondary: string; textMuted: string;
    error: string; success: string; discount: string; warning: string; overlay: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; screenPadding: number };
  radius: { sm: number; md: number; lg: number; xl: number; cardRadius: number; full: number };
  shadow: {
    shadow1: Record<string, unknown>;
    shadow2: Record<string, unknown>;
    shadow3: Record<string, unknown>;
  };
  button: { primaryHeight: number; fabSize: number };
  image: {
    storeCardHeight: number; storeListRowSize: number; storeCoverHeight: number;
    productSize: number; productHeroHeight: number; padding: number;
  };
};

const base = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, screenPadding: 20 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, cardRadius: 18, full: 9999 },
  button: { primaryHeight: 52, fabSize: 48 },
  image: {
    storeCardHeight: 206, storeListRowSize: 120, storeCoverHeight: 300,
    productSize: 142, productHeroHeight: 310, padding: 8,
  },
};

/** Phase-one customer system: warm brand action on quiet neutral surfaces. */
export const lightTheme: Theme = {
  fonts,
  typography,
  colors: {
    primary: '#FF6B1A',
    primaryDark: '#D94A00',
    primarySoft: '#FFF1E8',
    apricot: '#FFB36B',
    peach: '#FFE8D6',
    white: '#FFFFFF',
    background: '#FAF9F7',
    backgroundSecondary: '#F3F0EC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    glass: 'rgba(255,255,255,0.88)',
    glassBorder: 'rgba(33,26,23,0.08)',
    highlight: 'rgba(255,255,255,0.92)',
    border: 'rgba(33,26,23,0.13)',
    borderLight: 'rgba(33,26,23,0.08)',
    text: '#171513',
    textSecondary: '#635E58',
    textMuted: '#908A83',
    error: '#E65454',
    success: '#2DBE83',
    discount: '#E65454',
    warning: '#F28C28',
    overlay: 'rgba(42,26,18,0.42)',
  },
  spacing: base.spacing,
  radius: base.radius,
  button: base.button,
  image: base.image,
  shadow: {
    shadow1: {
      shadowColor: '#171513', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    shadow2: {
      shadowColor: '#171513', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
    },
    shadow3: {
      shadowColor: '#D94A00', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18, shadowRadius: 18, elevation: 8,
    },
  },
};

// Kept as an alias so older imports continue to compile during migration.
export const theme = lightTheme;
