import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { Upload, Terminal, Home, BookOpen, Settings, type LucideIcon } from 'lucide-react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UploadModal from './UploadModal'
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
          background: '#141415',
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
        className="hidden md:block sticky top-0 z-50 w-full"
        style={{
          background: '#141415',
          borderBottom: `1px solid ${tokens.colors.border}`,
          height: 56,
        }}
      >
        <div className="flex h-full items-center px-6">
          {/* River wordmark — 17px/600, logo exception */}
          <span
            className="mr-8 select-none"
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

          {/* Desktop nav — shadcn Tabs, line variant */}
          <Tabs
            value={currentTab}
            onValueChange={(value) => {
              const item = NAV_ITEMS.find((i) => i.value === value)
              if (item) navigate(item.href)
            }}
            className="flex h-full"
          >
            <TabsList variant="line" className="h-full gap-0 bg-transparent border-0 p-0">
              {NAV_ITEMS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="relative h-full rounded-none border-0 shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent after:hidden"
                  style={{
                    color: currentTab === item.value ? tokens.colors.textPrimary : tokens.colors.textSecondary,
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: '20px',
                    gap: 6,
                    paddingLeft: 16,
                    paddingRight: 16,
                  }}
                >
                  <item.Icon size={20} strokeWidth={1.5} className="shrink-0" />
                  {item.name}
                  {/* Active accent border */}
                  {currentTab === item.value && (
                    <span
                      className="absolute bottom-0 left-4 right-4"
                      style={{
                        height: 2,
                        background: tokens.colors.accent,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex-1" />

          {/* Upload ghost button */}
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
            style={{
              fontSize: 13,
              fontWeight: 500,
              lineHeight: '20px',
              color: tokens.colors.textSecondary,
              background: 'transparent',
              border: `1px solid ${tokens.colors.border}`,
              transition: 'color 150ms ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = tokens.colors.textPrimary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = tokens.colors.textSecondary
            }}
          >
            <Upload size={14} strokeWidth={1.5} />
            Upload
          </button>
        </div>
      </nav>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />

      {/* Page shell — max-width 1440px, 16px mobile / 32px desktop padding */}
      <main className="flex-1 w-full mx-auto px-4 md:px-8 pb-[84px] md:pb-0" style={{ maxWidth: 1440, paddingTop: 24 }}>
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      {/* ─── Mobile bottom tab bar — iOS-style ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: '#141415',
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
            const color = isActive ? '#818CF8' : tokens.colors.textQuaternary
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
                }}
              >
                <item.Icon className="h-7 w-7 shrink-0" strokeWidth={1.5} />
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
