import { ReactNode } from 'react'
import { motion, type Transition } from 'motion/react'
import { tokens } from '../designTokens'
import { getIconPreset } from './AnimatedIcon'

const spring: Transition = { type: 'spring', stiffness: 400, damping: 17 }

interface PanelToolbarProps {
  title: string
  actions?: ReactNode
  onBack?: () => void
}

export function PanelToolbar({ title, actions, onBack }: PanelToolbarProps) {
  return (
    <div
      className="shrink-0 flex items-center gap-2 px-4"
      style={{
        height: 48,
        borderBottom: '1px solid ' + tokens.colors.borderSubtle,
      }}
    >
      {onBack && (
        <motion.button
          onClick={onBack}
          className="animated-icon md:hidden shrink-0 flex items-center justify-center rounded-md transition-colors"
          style={{ width: 28, height: 28, color: tokens.colors.accent }}
          whileHover={{ x: -2 }}
          transition={spring}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </motion.button>
      )}
      <span
        className="flex-1 min-w-0 truncate"
        style={{ fontSize: 15, fontWeight: 500, color: tokens.colors.textPrimary }}
      >
        {title}
      </span>
      {actions && (
        <div className="shrink-0 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  )
}

/* ── Preset configs (duplicated from AnimatedIcon to avoid circular concerns) ── */

const presetConfigs: Record<string, { whileHover: Record<string, unknown>; transition: Transition }> = {
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
  'scale-ring':   { whileHover: { scale: 1.1 }, transition: spring },
  'scale-fill':   { whileHover: { scale: 1.15 }, transition: spring },
  'flicker':      { whileHover: { x: [-1, 1, -1, 0] }, transition: { duration: 0.2 } },
  'ring':         { whileHover: { rotate: [-15, 15, -10, 10, 0] }, transition: { duration: 0.4 } },
  'fade':         { whileHover: { opacity: 1 }, transition: { duration: 0.15 } },
}

/** Toolbar action button — icon-only, 32px tap targets, animated on hover */
export function ToolbarAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}) {
  const preset = getIconPreset(Icon)
  const config = presetConfigs[preset] || presetConfigs.fade

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`animated-icon flex items-center justify-center rounded-md transition-colors disabled:opacity-40${destructive ? '' : ''}`}
      style={{
        width: 32,
        height: 32,
        color: destructive ? tokens.colors.red : tokens.colors.textSecondary,
      }}
      whileHover={disabled ? undefined : config.whileHover}
      transition={config.transition}
    >
      <Icon className="h-4 w-4 shrink-0" />
    </motion.button>
  )
}
