export const Colors = {
  background: '#F8FAFC',
  text: '#0F172A',
  accent: '#2563EB',
  ctaAccent: '#EA580C',
  contrast: '#FFFFFF',
  border: '#E2E8F0',
  muted: '#475569',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  card: '#FFFFFF',
  overlay: 'rgba(17,17,17,0.45)'
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999
} as const;

export const Fonts = {
  regular: 14,
  small: 12,
  title: 20,
  heading: 28
} as const;

/** Self-hosted en assets/fonts, registradas en App.tsx vía expo-font (useFonts). */
export const FontFamily = {
  displayBold: 'Sora-Bold',
  displayExtraBold: 'Sora-ExtraBold',
  bodyRegular: 'Manrope-Regular',
  bodySemiBold: 'Manrope-SemiBold',
  bodyBold: 'Manrope-Bold',
  bodyExtraBold: 'Manrope-ExtraBold',
} as const;
