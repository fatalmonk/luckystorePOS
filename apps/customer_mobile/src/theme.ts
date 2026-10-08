export const colors = {
  paper: '#FDFBF7',
  surface: '#FFFFFF',
  ink: '#0B0B0D',
  deepNight: '#0B0B0D',
  muted: '#6B6B6B',
  green: '#0B5D3B',
  greenSoft: '#DCEEE4',
  accent: '#f0c444',
  saffron: '#f0c444',
  accentMuted: '#FFF8E1',
  line: '#E8E4DC',
  danger: '#E34234',
  success: '#16A34A',
  onTint: '#0B0B0D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const type = {
  largeTitle: { fontSize: 32, fontWeight: '900', color: colors.ink, lineHeight: 38 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 28 },
  headline: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', color: colors.ink, lineHeight: 22 },
  subhead: { fontSize: 14, fontWeight: '500', color: colors.muted, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '600', color: colors.muted, lineHeight: 16 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;
