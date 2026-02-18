import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Terminal, Home, BookOpen, Settings } from 'lucide-react'

const FULL_BLEED_ROUTES = ['/ops', '/knowledge']

export default function Layout() {
  const location = useLocation()
  const isFullBleed = FULL_BLEED_ROUTES.includes(location.pathname)

  const navigation = [
    { name: 'Ops', href: '/ops', icon: Terminal },
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Knowledge', href: '/knowledge', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex flex-col relative">
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderBottom: '1px solid var(--glass-border)',
          height: '48px',
        }}
      >
        <div className="container flex h-full items-center justify-between px-6 md:px-8">
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>River</span>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="relative flex items-center gap-1.5 text-sm px-3 py-1.5 transition-colors duration-200"
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                    fontWeight: isActive ? 500 : 400,
                  })}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>

          <div className="w-8" />
        </div>
      </header>

      <main className={isFullBleed ? 'flex-1 overflow-hidden' : 'container mx-auto px-6 py-6 pb-20 md:px-8 md:pb-8'}>
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderTop: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors duration-200"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                  fontWeight: isActive ? 500 : 400,
                })}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
