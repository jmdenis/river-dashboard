// ─── Design System Foundation ───────────────────────────────────────
// Single source of truth for all semantic values used across the app.
// Direction: Linear-inspired neutral dark. No glass, no Apple HIG.

export const tokens = {
  colors: {
    bg: '#1C1C1C',
    surface: '#242424',
    surfaceHover: '#323232',
    overlay: '#2C2C2C',
    border: 'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.08)',
    borderHover: 'rgba(255,255,255,0.12)',
    textPrimary: '#E5E5E5',
    textSecondary: '#A1A1A1',
    textTertiary: '#666666',
    textQuaternary: 'rgba(255,255,255,0.18)',
    accent: '#0A84FF',
    accentSubtle: 'rgba(10,132,255,0.12)',
    accentFaint: 'rgba(10,132,255,0.06)',
    green: '#34D399',
    red: '#F87171',
    orange: '#f97316',
    blue: '#0A84FF',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  radii: {
    sm: 6,
    md: 8,
  },

  typography: {
    display: { fontSize: 20, fontWeight: 600, lineHeight: '28px' } as const,
    title: { fontSize: 15, fontWeight: 500, lineHeight: '20px' } as const,
    body: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 } as const,
    caption: { fontSize: 12, fontWeight: 500, lineHeight: '16px' } as const,
    label: { fontSize: 11, fontWeight: 500, lineHeight: '16px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    micro: { fontSize: 10, fontWeight: 500, lineHeight: '16px' } as const,
    mono: { fontSize: 12, fontFamily: 'JetBrains Mono, SF Mono, monospace' },
  },
} as const

// ─── Reusable Style Objects ─────────────────────────────────────────

export const styles = {
  card: {
    background: tokens.colors.surface,
    border: '1px solid ' + tokens.colors.border,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.xxl,
  } as React.CSSProperties,

  sectionHeader: {
    ...tokens.typography.label,
    color: tokens.colors.textTertiary,
  } as React.CSSProperties,
} as const

// ─── Animations ─────────────────────────────────────────────────────

export const animations = {
  planeFloat: {
    animate: { x: [-2, 2, -2], y: [0, -2, 0], rotate: [-3, 3, -3] },
    transition: { duration: 3, ease: 'easeInOut' as const, repeat: Infinity },
  },
} as const
