// ─── Design System Foundation ───────────────────────────────────────
// Single source of truth for all semantic values used across the app.
// Direction: Linear-inspired neutral dark. No glass, no Apple HIG.

export const tokens = {
  colors: {
    bg: '#0A0A0B',
    surface: '#141415',
    surfaceHover: '#1C1C1E',
    elevated: '#1E1E20',
    overlay: '#252527',
    border: 'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.05)',
    textPrimary: 'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.55)',
    textTertiary: 'rgba(255,255,255,0.35)',
    textQuaternary: 'rgba(255,255,255,0.18)',
    accent: '#818CF8',
    accentSubtle: 'rgba(129,140,248,0.10)',
    accentMuted: 'rgba(129,140,248,0.20)',
    green: '#34D399',
    red: '#F87171',
    orange: '#FBBF24',
    yellow: '#FDE68A',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radii: {
    sm: 6,
    md: 8,
    lg: 12,
  },

  typography: {
    display: { fontSize: 20, fontWeight: 600, lineHeight: '28px' } as const,
    title: { fontSize: 15, fontWeight: 500, lineHeight: '20px' } as const,
    body: { fontSize: 13, fontWeight: 400, lineHeight: '20px' } as const,
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

  cardElevated: {
    background: tokens.colors.elevated,
    border: '1px solid ' + tokens.colors.border,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.xxl,
  } as React.CSSProperties,

  sectionHeader: {
    ...tokens.typography.label,
    color: tokens.colors.textTertiary,
  } as React.CSSProperties,

  segmentedControl: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: tokens.radii.md,
    padding: 3,
  } as React.CSSProperties,

  segmentedButtonActive: {
    fontSize: tokens.typography.caption.fontSize,
    fontWeight: 500,
    paddingLeft: tokens.spacing.lg,
    paddingRight: tokens.spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: tokens.radii.sm,
    background: tokens.colors.overlay,
    color: tokens.colors.textPrimary,
    transition: 'all 200ms',
  } as React.CSSProperties,

  segmentedButtonInactive: {
    fontSize: tokens.typography.caption.fontSize,
    fontWeight: 500,
    paddingLeft: tokens.spacing.lg,
    paddingRight: tokens.spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: tokens.radii.sm,
    background: 'transparent',
    color: tokens.colors.textTertiary,
    transition: 'all 200ms',
  } as React.CSSProperties,

  separator: {
    height: 0.5,
    background: tokens.colors.border,
  } as React.CSSProperties,
} as const

// ─── Animations ─────────────────────────────────────────────────────

export const animations = {
  planeFloat: {
    animate: { x: [-2, 2, -2], y: [0, -2, 0], rotate: [-3, 3, -3] },
    transition: { duration: 3, ease: 'easeInOut' as const, repeat: Infinity },
  },

  iconHover: {
    whileHover: { scale: 1.05, rotate: -5 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },

  statusPulse: {
    animate: { opacity: [0.5, 1, 0.5] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  },
} as const
