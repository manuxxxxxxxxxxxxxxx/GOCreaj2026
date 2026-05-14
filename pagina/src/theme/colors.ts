export const Colors = {
  blue:       '#4f6ef7',
  blueLight:  '#6c8af7',
  purple:     '#8b3cf7',
  pink:       '#e040a0',
  green:      '#22c55e',
  greenDark:  '#16a34a',
  cyan:       '#38bdf8',
  red:        '#ef4444',
  orange:     '#f97316',
  amber:      '#f59e0b',
  yellow:     '#d97706',

  text:       '#1a1a2e',
  textMuted:  '#64748b',
  textLight:  '#94a3b8',

  bg:         '#f1f5f9',
  white:      '#ffffff',
  dark:       '#0f172a',
  darkCard:   '#1e293b',

  border:     '#e8ecf0',
  borderDark: '#334155',

  cardBg:     '#ffffff',
  inputBg:    '#f8fafc',

  gradients: {
    primary:  ['#4f6ef7', '#8b3cf7'] as [string, string],
    hero:     ['#4f6ef7', '#7c3af7', '#c026a0', '#e040a0'] as [string, string, string, string],
    green:    ['#16a34a', '#22c55e'] as [string, string],
    blue:     ['#2563eb', '#38bdf8'] as [string, string],
    purple:   ['#7c3aed', '#c026d3'] as [string, string],
    pink:     ['#db2777', '#ec4899'] as [string, string],
    cta:      ['#2563eb', '#7c3aed', '#a855f7'] as [string, string, string],
    footer:   ['#0f172a', '#1e293b'] as [string, string],
  },

  badge: {
    promo:  '#3b82f6',
    new:    '#059669',
    feat:   '#d97706',
    pop:    '#dc2626',
  },

  role: {
    buyer:  '#22c55e',
    seller: '#38bdf8',
    driver: '#a855f7',
    admin:  '#f97316',
  },
} as const;

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;
