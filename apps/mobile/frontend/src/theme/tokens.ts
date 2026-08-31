export interface ThemeTokens {
  mode: "light" | "dark";
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  cyan: string;
  cyanInk: string;
  cyanBg: string;
  cyanGlow: string;
  violet: string;
  violetInk: string;
  violetBg: string;
  violetGlow: string;
  coral: string;
  coralInk: string;
  coralBg: string;
  ok: string;
  okBg: string;
  okInk: string;
  warn: string;
  warnBg: string;
  warnInk: string;
  danger: string;
  dangerBg: string;
  dangerInk: string;
}

export const lightTokens: ThemeTokens = {
  mode: "light",
  bg: "#E9ECF3",
  surface1: "#F3F4F9",
  surface2: "#E3E7EF",
  surface3: "#D5DAE6",
  textPrimary: "#10162A",
  textSecondary: "#4B5670",
  textMuted: "#828BA1",
  border: "#D2D8E4",
  borderStrong: "#B9C1D6",
  cyan: "#0891B2",
  cyanInk: "#FFFFFF",
  cyanBg: "#DFF3F8",
  cyanGlow: "rgba(8,145,178,0.16)",
  violetGlow: "rgba(124,58,237,0.12)",
  violet: "#7C3AED",
  violetInk: "#FFFFFF",
  violetBg: "#EDE4FD",
  coral: "#F5642E",
  coralInk: "#FFFFFF",
  coralBg: "#FDE5DA",
  ok: "#0F8F5F",
  okBg: "#DEF4E9",
  okInk: "#063D29",
  warn: "#B4700A",
  warnBg: "#FBEBD3",
  warnInk: "#4A2C04",
  danger: "#C23B3B",
  dangerBg: "#FBE2E2",
  dangerInk: "#4A1414",
};

export const darkTokens: ThemeTokens = {
  mode: "dark",
  bg: "#080B14",
  surface1: "#0F1420",
  surface2: "#161C2C",
  surface3: "#1E2537",
  textPrimary: "#F1F4FC",
  textSecondary: "#A6B0C8",
  textMuted: "#68708A",
  border: "#212A3E",
  borderStrong: "#2D3750",
  cyan: "#38D6FF",
  cyanInk: "#04141C",
  cyanBg: "#0E2934",
  cyanGlow: "rgba(56,214,255,0.22)",
  violetGlow: "rgba(167,139,250,0.16)",
  violet: "#A78BFA",
  violetInk: "#1B0F38",
  violetBg: "#241A42",
  coral: "#FF8A5C",
  coralInk: "#2C1206",
  coralBg: "#3A2013",
  ok: "#3CDE93",
  okBg: "#0E2A1E",
  okInk: "#BDF6D9",
  warn: "#FFB648",
  warnBg: "#2E2107",
  warnInk: "#FFE1AE",
  danger: "#FF6B6B",
  dangerBg: "#2E1414",
  dangerInk: "#FFC9C9",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

/** Glow shadow for the 1-2 "alive" elements per screen (primary CTA, active
 * in-progress state). Not meant to be applied broadly -- see AGENTS notes in
 * FRONTEND_HANDOFF.md on not saturating the UI with accent color. */
export function glowShadow(color: string, size: "sm" | "md" | "lg" = "md") {
  const cfg = { sm: { radius: 8, elevation: 4 }, md: { radius: 16, elevation: 8 }, lg: { radius: 28, elevation: 14 } }[size];
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: size === "sm" ? 2 : size === "md" ? 4 : 8 },
    shadowOpacity: 1,
    shadowRadius: cfg.radius,
    elevation: cfg.elevation,
  };
}

export const fonts = {
  display: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  mono: "IBMPlexMono_500Medium",
};
