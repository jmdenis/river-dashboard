import { ReactNode, useRef } from 'react'
import { motion, type Transition } from 'motion/react'
import { tokens } from '../designTokens'
import { ArrowNarrowLeftIcon, type AnimatedIconHandle } from './icons'

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
        <button
          onClick={onBack}
          className="md:hidden shrink-0 flex items-center justify-center rounded-md transition-colors"
          style={{ width: 28, height: 28, color: tokens.colors.accent }}
        >
          <ArrowNarrowLeftIcon size={20} strokeWidth={2} />
        </button>
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

/** Toolbar action button — icon-only, 32px tap targets.
 *  Itshover icons provide their own hover animations. */
export function ToolbarAction({
  icon: Icon,
  label,
  onClick,
  destructive = false,
  disabled = false,
}: {
  icon: React.ComponentType<any>
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}) {
  const iconRef = useRef<AnimatedIconHandle>(null)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
      style={{
        width: 32,
        height: 32,
        color: destructive ? tokens.colors.red : tokens.colors.textSecondary,
      }}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <Icon ref={iconRef} size={16} strokeWidth={1.5} />
    </button>
  )
}
