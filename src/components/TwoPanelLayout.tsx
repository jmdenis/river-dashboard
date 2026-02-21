import { ReactNode, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { tokens } from '../designTokens'
import { DetailEmptyState } from './DetailEmptyState'

interface TwoPanelLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode | null
  emptyState: { icon: ReactNode; text: string }
  selectedKey?: string | null
  mobileOpen?: boolean
  onMobileClose?: () => void
  mobileTitle?: string
}

export function TwoPanelLayout({
  leftPanel,
  rightPanel,
  emptyState,
  selectedKey,
  mobileOpen = false,
  onMobileClose,
  mobileTitle = 'Detail',
}: TwoPanelLayoutProps) {
  /* ── Swipe: right on detail → back to list ──────── */
  const touchRef = useRef({ x: 0, y: 0 })

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const onDetailTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    if (dx > 50 && Math.abs(dx) > Math.abs(dy)) {
      onMobileClose?.()
    }
  }, [onMobileClose])

  return (
    <>
      {/* iPadOS Mail-style card container */}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row md:rounded-lg overflow-hidden relative"
        style={{
          background: tokens.colors.surface,
          marginTop: 12,
          border: '1px solid #ccc',
          boxShadow: 'inset 0 0 1px rgba(0,0,0,0.1)',
        }}
      >
        {/* Left Panel — 35% width, surface bg, dense list */}
        <div
          className="shrink-0 flex flex-col w-full md:w-[35%] md:max-w-[420px] overflow-hidden"
          style={{
            background: tokens.colors.surface,
            borderRight: '1px solid ' + tokens.colors.borderSubtle,
          }}
        >
          {leftPanel}
        </div>

        {/* Right Panel — desktop only, slightly lifted bg for depth */}
        <div
          className="hidden md:flex flex-1 min-w-0 flex-col overflow-hidden"
          style={{ background: tokens.colors.surfaceDetail }}
        >
          <AnimatePresence mode="wait">
            {rightPanel ? (
              <motion.div
                key={selectedKey || 'detail'}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {rightPanel}
              </motion.div>
            ) : (
              <DetailEmptyState icon={emptyState.icon} text={emptyState.text} />
            )}
          </AnimatePresence>
        </div>

        {/* Mobile slide-in detail panel (iOS-style push) */}
        <div
          className="md:hidden absolute inset-0 z-20 flex flex-col"
          style={{
            transform: mobileOpen && rightPanel ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms ease',
            background: tokens.colors.bg,
            maxHeight: 'calc(100vh - 120px)',
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onDetailTouchEnd}
        >
          {rightPanel}
        </div>
      </div>
    </>
  )
}
