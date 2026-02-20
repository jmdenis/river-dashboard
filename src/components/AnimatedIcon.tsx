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

  // Hugeicons equivalents
  ArrowDown01Icon: 'nudge-down',
  ArrowRight01Icon: 'nudge-right',
  ArrowUp01Icon: 'nudge-up',
  UnfoldMoreIcon: 'nudge-down',
  Delete02Icon: 'rotate-shake',
  Cancel01Icon: 'rotate-shake',
  Tick02Icon: 'bounce-y',
  CheckmarkCircle02Icon: 'bounce-y',
  Copy01Icon: 'nudge-down',
  SentIcon: 'nudge-right',
  Loading03Icon: 'rotate-full',
  Upload02Icon: 'nudge-up',
  Download02Icon: 'nudge-down',
  Note01Icon: 'fade',
  Folder01Icon: 'fade',
  ArrowLeft01Icon: 'nudge-left',
  Location01Icon: 'nudge-down',
  PlusSignIcon: 'rotate-spring',
  Mail01Icon: 'nudge-right',
  Settings01Icon: 'rotate-full',
  Alert02Icon: 'shake',
  Key01Icon: 'shake',
  Bug01Icon: 'shake',
  InboxIcon: 'fade',
  RotateClockwiseIcon: 'rotate-full',
  Clock01Icon: 'fade',
  ArtificialIntelligence01Icon: 'fade',
  ShieldKeyIcon: 'fade',
  ArrowReloadHorizontalIcon: 'rotate-full',
  News01Icon: 'shake',
  TestTube01Icon: 'rotate-tilt',
  Wrench01Icon: 'rotate-tilt',
  BookOpen01Icon: 'nudge-right',
  YoutubeIcon: 'nudge-right',
  InstagramIcon: 'nudge-right',
  Share01Icon: 'nudge-right',
  Briefcase01Icon: 'nudge-right',
  Package01Icon: 'nudge-down',
  LinkSquare02Icon: 'nudge-right',
  PlayIcon: 'nudge-right',
  BookmarkAdd01Icon: 'scale-fill',
  InformationCircleIcon: 'shake',
  UserMultiple02Icon: 'fade',
  PencilEdit02Icon: 'rotate-tilt',
  SmartPhone01Icon: 'nudge-right',
  Search01Icon: 'scale-ring',
  CircleIcon: 'fade',
  GiftIcon: 'scale-fill',
  Calendar01Icon: 'fade',
  Tag01Icon: 'fade',
  // LifePage icons
  FavouriteIcon: 'scale-fill',
  StarIcon: 'scale-fill',
  SparklesIcon: 'scale-fill',
  WorkHistoryIcon: 'fade',
  CloudBigRainIcon: 'fade',
  Sun01Icon: 'fade',
  SunCloud01Icon: 'fade',
  CloudIcon: 'fade',
  SnowIcon: 'fade',
  CloudLittleRainIcon: 'fade',
  ZapIcon: 'shake',
  WindPower01Icon: 'fade',
  Home01Icon: 'fade',
  Airplane01Icon: 'nudge-right',
  Dumbbell01Icon: 'bounce-y',
  Luggage01Icon: 'fade',
  Hotel01Icon: 'fade',
  ParkingAreaCircleIcon: 'fade',
  CookBookIcon: 'fade',
  Car01Icon: 'nudge-right',
  ViewIcon: 'fade',
  ViewOffSlashIcon: 'fade',
  MessageMultiple01Icon: 'nudge-right',
  UserAdd01Icon: 'rotate-spring',
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
