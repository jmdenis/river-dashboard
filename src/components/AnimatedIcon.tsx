import { type ComponentType } from 'react'
import { motion, type Transition } from 'motion/react'

/* ── Animation presets ──────────────────────────────────── */

type AnimationPreset =
  | 'nudge-right'
  | 'nudge-left'
  | 'nudge-down'
  | 'nudge-up'
  | 'rotate-full'
  | 'rotate-shake'
  | 'rotate-spring'
  | 'rotate-tilt'
  | 'bounce-y'
  | 'shake'
  | 'scale-ring'
  | 'scale-fill'
  | 'flicker'
  | 'ring'
  | 'fade'

const spring: Transition = { type: 'spring', stiffness: 400, damping: 17 }

interface PresetConfig {
  whileHover: Record<string, unknown>
  transition: Transition
  initial?: Record<string, unknown>
}

const presetMap: Record<AnimationPreset, PresetConfig> = {
  'nudge-right':  { whileHover: { x: 2 }, transition: spring },
  'nudge-left':   { whileHover: { x: -2 }, transition: spring },
  'nudge-down':   { whileHover: { y: 2 }, transition: spring },
  'nudge-up':     { whileHover: { y: -2 }, transition: spring },
  'rotate-full':  { whileHover: { rotate: 360 }, transition: { type: 'spring', stiffness: 200, damping: 17 } },
  'rotate-shake': { whileHover: { rotate: -10 }, transition: spring },
  'rotate-spring':{ whileHover: { rotate: 90 }, transition: spring },
  'rotate-tilt':  { whileHover: { rotate: -15, y: -1 }, transition: spring },
  'bounce-y':     { whileHover: { scaleY: [1, 1.2, 1] }, transition: { duration: 0.3 } },
  'shake':        { whileHover: { x: [0, 2, -2, 2, 0] }, transition: { duration: 0.3 } },
  'scale-ring':   { whileHover: { scale: 1.1, filter: 'drop-shadow(0 0 4px rgba(0, 200, 255, 0.4))' }, transition: spring },
  'scale-fill':   { whileHover: { scale: 1.15 }, transition: spring },
  'flicker':      { whileHover: { x: [-1, 1, -1, 0] }, transition: { duration: 0.2 } },
  'ring':         { whileHover: { rotate: [-15, 15, -10, 10, 0] }, transition: { duration: 0.4 } },
  'fade':         { whileHover: { opacity: 1 }, transition: { duration: 0.15 }, initial: { opacity: 0.7 } },
}

/* ── Icon name → preset mapping ────────────────────────── */

const iconNameToPreset: Record<string, AnimationPreset> = {
  // Navigation / directional
  ChevronRight: 'nudge-right',
  ChevronLeft: 'nudge-left',
  ChevronDown: 'nudge-down',
  ChevronUp: 'nudge-up',
  ChevronsUpDown: 'nudge-down',
  ArrowRight: 'nudge-right',
  ExternalLink: 'nudge-right',

  // Refresh / sync
  RefreshCw: 'rotate-full',
  RotateCw: 'rotate-full',

  // Action / destructive
  Trash2: 'rotate-shake',
  X: 'rotate-shake',
  XCircle: 'rotate-shake',

  // Add / create
  Plus: 'rotate-spring',
  PlusCircle: 'rotate-spring',
  UserPlus: 'rotate-spring',

  // Edit / pencil
  Pencil: 'rotate-tilt',
  Edit: 'rotate-tilt',
  Edit2: 'rotate-tilt',
  Edit3: 'rotate-tilt',
  SquarePen: 'rotate-tilt',

  // Check / done
  Check: 'bounce-y',
  CheckCircle: 'bounce-y',
  CheckCircle2: 'bounce-y',

  // Alert / warning
  AlertTriangle: 'shake',
  AlertCircle: 'shake',
  Info: 'shake',

  // Search
  Search: 'scale-ring',

  // Star / bookmark / heart
  Star: 'scale-fill',
  Bookmark: 'scale-fill',
  Heart: 'scale-fill',
  Sparkles: 'scale-fill',

  // Terminal / code
  Terminal: 'flicker',
  Code: 'flicker',
  Code2: 'flicker',

  // Bell / notification
  Bell: 'ring',
  BellRing: 'ring',

  // Download / Upload
  Download: 'nudge-down',
  Upload: 'nudge-up',

  // Send
  Send: 'nudge-right',

  // Copy
  Copy: 'nudge-down',

  // Play
  Play: 'nudge-right',

  // Mail
  Mail: 'nudge-right',

  // Share
  Share2: 'nudge-right',

  // Map
  MapPin: 'nudge-down',
}

/* ── Resolve preset from icon component ──────────────── */

export function getIconPreset(Icon: ComponentType<any>): AnimationPreset {
  const displayName = (Icon as any).displayName || (Icon as any).name || ''
  return iconNameToPreset[displayName] || 'fade'
}

/* ── AnimatedIcon component ─────────────────────────────── */

interface AnimatedIconProps {
  icon: ComponentType<any>
  size?: number
  className?: string
  style?: React.CSSProperties
  strokeWidth?: number
  preset?: AnimationPreset
  /** Skip CSS stroke-color transition on hover (for colored icons) */
  noStroke?: boolean
}

export function AnimatedIcon({
  icon: Icon,
  size,
  className,
  style,
  strokeWidth,
  preset,
  noStroke,
}: AnimatedIconProps) {
  const resolvedPreset = preset || getIconPreset(Icon)
  const config = presetMap[resolvedPreset]

  return (
    <motion.div
      className={`animated-icon shrink-0 inline-flex items-center justify-center${noStroke ? ' animated-icon--colored' : ''}`}
      whileHover={config.whileHover}
      transition={config.transition}
      {...(config.initial ? { initial: config.initial } : {})}
    >
      <Icon size={size} className={className} style={style} strokeWidth={strokeWidth} />
    </motion.div>
  )
}
