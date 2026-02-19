// ─── Design System Foundation ───────────────────────────────────────
// Single source of truth for all semantic values used across the app.

export const tokens = {
  colors: {
    bg: '#000000',
    surface: 'rgba(255,255,255,0.06)',
    surfaceHover: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.1)',
    innerHighlight: 'rgba(255,255,255,0.08)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.4)',
    textQuaternary: 'rgba(255,255,255,0.25)',
    accent: '#0A84FF',
    green: '#30D158',
    red: '#FF453A',
    orange: '#FF9F0A',
    yellow: '#FFD60A',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  typography: {
    title: { fontSize: 24, fontWeight: 700 } as const,
    heading: { fontSize: 17, fontWeight: 600 } as const,
    body: { fontSize: 14, fontWeight: 400 } as const,
    caption: { fontSize: 13, fontWeight: 400 } as const,
    micro: { fontSize: 12, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    mono: { fontSize: 13, fontFamily: 'SF Mono, monospace' },
    brand: { fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' } as const,
  },
} as const

// ─── Reusable Style Objects ─────────────────────────────────────────

export const styles = {
  glassCard: {
    background: tokens.colors.surface,
    border: '1px solid ' + tokens.colors.border,
    borderRadius: tokens.radii.xl,
    padding: tokens.spacing.xxl,
    boxShadow: 'inset 0 1px 0 0 ' + tokens.colors.innerHighlight,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  } as React.CSSProperties,

  sectionHeader: {
    ...tokens.typography.micro,
    color: tokens.colors.textTertiary,
  } as React.CSSProperties,

  segmentedControl: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.xs,
  } as React.CSSProperties,

  segmentedButtonActive: {
    fontSize: tokens.typography.caption.fontSize,
    paddingLeft: tokens.spacing.lg,
    paddingRight: tokens.spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: tokens.radii.sm,
    background: 'rgba(255,255,255,0.1)',
    color: tokens.colors.textPrimary,
    fontWeight: 500,
    transition: 'all 200ms',
  } as React.CSSProperties,

  segmentedButtonInactive: {
    fontSize: tokens.typography.caption.fontSize,
    paddingLeft: tokens.spacing.lg,
    paddingRight: tokens.spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: tokens.radii.sm,
    color: tokens.colors.textTertiary,
    transition: 'all 200ms',
  } as React.CSSProperties,

  brand: {
    ...tokens.typography.brand,
    color: tokens.colors.textPrimary,
  } as React.CSSProperties,

  brandSpacer: {
    ...tokens.typography.brand,
    visibility: 'hidden' as const,
  } as React.CSSProperties,

  separator: {
    height: 0.5,
    background: tokens.colors.border,
  } as React.CSSProperties,
} as const

// ─── Animations ─────────────────────────────────────────────────────

export const animations = {
  planeFloat: {
    keyframes: {
      x: [-2, 2, -2],
      y: [0, -2, 0],
      rotate: [-3, 3, -3],
    },
    transition: {
      duration: 3,
      ease: 'easeInOut' as const,
      repeat: Infinity,
    },
  },

  iconHover: {
    scale: 1.1,
    rotate: -8,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },

  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 },
  },
} as const
