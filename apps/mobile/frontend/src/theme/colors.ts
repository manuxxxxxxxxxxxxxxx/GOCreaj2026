/** Bandera Institucional (ver DESIGN.md) — paleta legacy en modo claro.
 *  Para pantallas con soporte de modo oscuro real, usar useTheme() de
 *  ThemeContext.tsx en su lugar (fuente de verdad principal). */
export const Colors = {
  background: '#F3F6FC',
  text: '#0B1B33',
  accent: '#1D5FD1',
  ctaAccent: '#F0A202',
  contrast: '#FFFFFF',
  border: '#DCE4F1',
  muted: '#4A5A73',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  card: '#FFFFFF',
  overlay: 'rgba(11,27,51,0.45)'
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

/** Self-hosted en assets/fonts, registradas en App.tsx vía expo-font (useFonts).
 *  Bandera Institucional (ver DESIGN.md): Archivo para display, Hanken
 *  Grotesk para cuerpo — reemplaza a Sora/Manrope del sistema anterior. */
export const FontFamily = {
  displayBold: 'Archivo-Bold',
  displayExtraBold: 'Archivo-ExtraBold',
  bodyRegular: 'HankenGrotesk-Regular',
  bodySemiBold: 'HankenGrotesk-SemiBold',
  bodyBold: 'HankenGrotesk-Bold',
  bodyExtraBold: 'HankenGrotesk-ExtraBold',
} as const;
