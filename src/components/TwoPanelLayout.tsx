import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { tokens } from '../designTokens'
import { DetailEmptyState } from './DetailEmptyState'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet'

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
  return (
    <>
      {/* iPadOS Mail-style card container */}
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row md:border md:border-[rgba(255,255,255,0.08)] md:rounded-xl md:overflow-hidden"
        style={{
          background: tokens.colors.bg,
          marginTop: 12,
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
          style={{ background: '#0F0F10' }}
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
      </div>

      {/* Mobile bottom Sheet */}
      <Sheet
        open={mobileOpen && !!rightPanel}
        onOpenChange={(open) => {
          if (!open && onMobileClose) onMobileClose()
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          hideOverlay
          className="md:hidden h-[85vh] rounded-t-2xl p-0 flex flex-col"
          style={{ background: tokens.colors.bg, minHeight: 'calc(100vh - 64px)' }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{mobileTitle}</SheetTitle>
            <SheetDescription>Detail view</SheetDescription>
          </SheetHeader>
          {rightPanel}
        </SheetContent>
      </Sheet>
    </>
  )
}
