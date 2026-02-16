import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Activity, Heart, User, Upload } from 'lucide-react'
import UploadModal from './UploadModal'

export default function Layout() {
  const location = useLocation()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [globalDrag, setGlobalDrag] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[]>()

  const navigation = [
    { name: 'Ops', href: '/ops', icon: Activity },
    { name: 'Life', href: '/life', icon: Heart },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      setGlobalDrag(true)
    }
  }, [])

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setGlobalDrag(false)
    }
  }, [])

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setGlobalDrag(false)
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      setDroppedFiles(files)
      setUploadOpen(true)
    }
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    setUploadOpen(open)
    if (!open) setDroppedFiles(undefined)
  }, [])

  return (
    <div
      className="min-h-screen bg-[#0A0A0A]"
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
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

          <button
            onClick={() => setUploadOpen(true)}
            className="p-2 text-white/40 hover:text-white/70 transition-colors duration-150"
            title="Upload files"
          >
            <Upload className="h-4 w-4" />
          </button>
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

      <UploadModal open={uploadOpen} onOpenChange={handleOpenChange} initialFiles={droppedFiles} />

      {/* Global drag overlay */}
      {globalDrag && (
        <div className="fixed inset-0 z-[60] bg-violet-500/5 border-2 border-dashed border-violet-500/40 pointer-events-none flex items-center justify-center">
          <div className="bg-[#0D0D0D]/90 backdrop-blur-sm rounded-xl px-6 py-4 border border-violet-500/20">
            <Upload className="h-6 w-6 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-white/60">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  )
}
