import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Activity, Upload, Heart, User } from 'lucide-react'

export default function Layout() {
  const location = useLocation()

  const navigation = [
    { name: 'Ops', href: '/ops', icon: Activity },
    { name: 'Files', href: '/files', icon: Upload },
    { name: 'Life', href: '/life', icon: Heart },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="sticky top-0 z-50 w-full bg-transparent border-b border-white/[0.06]">
        <div className="container flex h-12 items-center justify-between px-4 md:px-8">
          <span className="text-sm font-medium text-white/60">River</span>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `relative text-sm px-3 py-1.5 transition-colors duration-150 ${
                    isActive
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="w-12" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-20 md:px-8 md:pb-8">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-[#0A0A0A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0A0A0A]/80">
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`
                }
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
