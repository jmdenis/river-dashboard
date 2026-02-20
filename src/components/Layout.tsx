import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { Upload, Terminal, Home, BookOpen, Settings, type LucideIcon } from 'lucide-react'

import UploadModal from './UploadModal'
import { AnimatedIcon } from './AnimatedIcon'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { tokens } from '../designTokens'

const NAV_ITEMS: { name: string; value: string; href: string; Icon: LucideIcon }[] = [
  { name: 'Ops', value: 'ops', href: '/ops', Icon: Terminal },
  { name: 'Home', value: 'home', href: '/home', Icon: Home },
  { name: 'Knowledge', value: 'knowledge', href: '/knowledge', Icon: BookOpen },
  { name: 'Settings', value: 'settings', href: '/settings', Icon: Settings },
]

function pathToTab(pathname: string): string {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.href))
  return match ? match.value : 'ops'
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [uploadOpen, setUploadOpen] = useState(false)
  const currentTab = pathToTab(location.pathname)

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* ─── Mobile header bar ─── */}
      <header
        className="md:hidden sticky top-0 z-50 w-full flex items-center px-4"
        style={{
          background: tokens.colors.surface,
          borderBottom: `1px solid ${tokens.colors.border}`,
          height: 48,
        }}
      >
        <span
          className="select-none"
          style={{
            fontSize: 17,
            fontWeight: 600,
            lineHeight: '20px',
            letterSpacing: '-0.02em',
            color: tokens.colors.textPrimary,
          }}
        >
          River
        </span>
      </header>

      {/* ─── Desktop top bar ─── */}
      <nav
        className="hidden md:flex sticky top-0 z-50 w-full items-center justify-between"
        style={{
          background: tokens.colors.surface,
          borderBottom: `1px solid ${tokens.colors.borderSubtle}`,
          height: 64,
        }}
      >
        <div className="flex h-full items-center justify-between w-full max-w-7xl mx-auto" style={{ paddingLeft: 24, paddingRight: 24 }}>
          {/* Left group */}
          <div className="flex items-center h-full" style={{ gap: 32 }}>
            {/* River wordmark — 20px/700 */}
            <span
              className="select-none"
              style={{
                fontSize: 20,
                fontWeight: 700,
                lineHeight: '24px',
                letterSpacing: '-0.02em',
                color: tokens.colors.textPrimary,
              }}
            >
              River
            </span>

            {/* Nav items */}
            <div className="flex items-center h-full" style={{ gap: 24 }}>
              {NAV_ITEMS.map((item) => {
                const isActive = currentTab === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => navigate(item.href)}
                    className="relative flex items-center h-full"
                    style={{
                      gap: 8,
                      cursor: 'pointer',
                      paddingTop: 8,
                      paddingBottom: 8,
                      background: 'none',
                      border: 'none',
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                      opacity: isActive ? 1 : 0.6,
                      transition: 'color 150ms, opacity 150ms, transform 150ms',
                      transform: 'scale(1)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#FFFFFF'
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.transform = 'scale(1.08)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                        e.currentTarget.style.opacity = '0.6'
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    <AnimatedIcon icon={item.Icon} style={{ width: 20, height: 20 }} strokeWidth={1.5} />
                    <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '20px' }}>
                      {item.name}
                    </span>
                    {/* Active indicator — bottom border aligned to navbar edge */}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: tokens.colors.accent,
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right group */}
          <Popover open={uploadOpen} onOpenChange={setUploadOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center"
                style={{
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: '20px',
                  padding: '8px 16px',
                  borderRadius: 8,
                  color: tokens.colors.textSecondary,
                  background: 'transparent',
                  border: `1px solid ${tokens.colors.borderSubtle}`,
                  cursor: 'pointer',
                  transition: 'color 150ms, border-color 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = tokens.colors.textPrimary
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tokens.colors.textSecondary
                  e.currentTarget.style.borderColor = tokens.colors.borderSubtle
                }}
              >
                <AnimatedIcon icon={Upload} style={{ width: 16, height: 16 }} strokeWidth={1.5} />
                Upload
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[400px] max-h-[calc(100vh-80px)] overflow-hidden p-0"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'none' }}
            >
              <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
            </PopoverContent>
          </Popover>
        </div>
      </nav>

      {/* Page shell — max-w-7xl (1280px), 16px mobile / 32px desktop padding */}
      <main className="flex-1 w-full pb-[84px] md:pb-0">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      {/* ─── Mobile bottom tab bar — iOS-style ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: tokens.colors.surface,
          borderTop: `1px solid ${tokens.colors.borderSubtle}`,
        }}
      >
        <div
          className="flex items-start justify-around"
          style={{
            height: 50,
            paddingTop: 6,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.value
            const color = isActive ? tokens.colors.accent : tokens.colors.textTertiary
            return (
              <button
                key={item.value}
                onClick={() => navigate(item.href)}
                className="flex flex-col items-center justify-start flex-1"
                style={{
                  color,
                  background: 'none',
                  border: 'none',
                  minHeight: 50,
                  gap: 4,
                  paddingTop: 2,
                  opacity: isActive ? 1 : 0.6,
                  transition: 'color 150ms, opacity 150ms',
                  cursor: 'pointer',
                }}
              >
                <AnimatedIcon icon={item.Icon} className="h-7 w-7" strokeWidth={1.5} />
                <span style={{ fontSize: 10, fontWeight: 500, lineHeight: '12px', color }}>
                  {item.name}
                </span>
              </button>
            )
          })}
        </div>
        {/* Safe area spacer */}
        <div style={{ height: 34, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </div>
  )
}
