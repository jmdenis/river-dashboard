import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Upload, Terminal, Home, BookOpen, Settings, type LucideIcon } from 'lucide-react'

import UploadModal from './UploadModal'

const ICON_HOVER: Record<string, object> = {
  Ops: { y: -1 },
  Home: { rotate: -8 },
  Knowledge: { scale: 1.1 },
  Settings: { rotate: 30 },
}

const FULL_BLEED_ROUTES = ['/ops', '/knowledge', '/home', '/settings']

const NAV_ITEMS: { name: string; href: string; Icon: LucideIcon }[] = [
  { name: 'Home', href: '/home', Icon: Home },
  { name: 'Ops', href: '/ops', Icon: Terminal },
  { name: 'Knowledge', href: '/knowledge', Icon: BookOpen },
  { name: 'Settings', href: '/settings', Icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const isFullBleed = FULL_BLEED_ROUTES.includes(location.pathname)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Desktop top bar */}
      <header
        className="sticky top-0 z-50 w-full border-b border-white/[0.08]"
        style={{
          background: 'rgba(0, 0, 0, 0.80)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          height: '56px',
        }}
      >
        <div className="flex h-full items-center px-5 md:px-6">
          {/* River logo */}
          <span
            className="mr-8"
            style={{
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-1)',
            }}
          >
            River
          </span>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-2 text-[14px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/[0.1] rounded-xl px-4 py-2'
                      : 'rounded-xl px-4 py-2 hover:bg-white/[0.05]'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  minWidth: '80px',
                  justifyContent: 'center',
                })}
              >
                {({ isActive }) => (
                  <>
                    <motion.div
                      className="inline-flex items-center justify-center"
                      animate={hoveredTab === item.name ? ICON_HOVER[item.name] : { y: 0, rotate: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <item.Icon
                        size={18}
                        className={`shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}
                        strokeWidth={1.5}
                      />
                    </motion.div>
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Version badge */}
          <span
            className="hidden md:inline text-[11px] font-mono tabular-nums mr-3"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            v2
          </span>

          {/* Upload button */}
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            className="hidden md:flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/[0.06]"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        </div>
      </header>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />

      <main className={isFullBleed ? 'flex-1 overflow-hidden' : 'flex-1 px-5 py-6 pb-20 md:px-6 md:pb-8'}>
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]"
        style={{
          background: 'rgba(0, 0, 0, 0.80)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around pt-2 pb-1.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className="group flex flex-col items-center gap-0.5 px-3 py-1 transition-colors duration-200"
              style={({ isActive }) => ({
                color: isActive ? '#0A84FF' : 'rgba(255,255,255,0.4)',
                fontWeight: isActive ? 500 : 400,
              })}
            >
              {({ isActive }) => (
                <>
                  <item.Icon size={18} className="shrink-0" strokeWidth={1.5} />
                  <span className="text-[11px]">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
