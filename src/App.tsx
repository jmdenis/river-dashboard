import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { ThemeProvider } from './components/ThemeProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import { Skeleton } from './components/ui/skeleton'
import { tokens } from './designTokens'
import Layout from './components/Layout'
import AnimatedPage from './components/AnimatedPage'
import OpsPage from './pages/OpsPage'
import LifePage from './pages/LifePage'
import ProfilePage from './pages/ProfilePage'

const KnowledgePage = lazy(() => import('./pages/KnowledgePage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))

function PageSkeleton() {
  return (
    <div
      className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]"
      style={{ background: tokens.colors.bg }}
    >
      <div className="h-full flex max-w-7xl mx-auto w-full md:px-6">
        <div
          className="w-full md:w-[35%] md:max-w-[420px] shrink-0 p-4 space-y-3"
          style={{ background: tokens.colors.surface, borderRight: '1px solid ' + tokens.colors.borderSubtle }}
        >
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-6 w-64 rounded-lg" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
        <div className="hidden md:flex flex-1 p-6 space-y-4 flex-col">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
          <Skeleton className="h-[300px] w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/ops" replace />} />
          <Route path="ops" element={<AnimatedPage><OpsPage /></AnimatedPage>} />
          <Route path="home" element={<AnimatedPage><LifePage /></AnimatedPage>} />
          <Route path="contacts" element={<AnimatedPage><Suspense fallback={<PageSkeleton />}><ContactsPage /></Suspense></AnimatedPage>} />
          <Route path="knowledge" element={<AnimatedPage><Suspense fallback={<PageSkeleton />}><KnowledgePage /></Suspense></AnimatedPage>} />
          <Route path="settings" element={<AnimatedPage><ProfilePage /></AnimatedPage>} />
          {/* Redirect old routes */}
          <Route path="life" element={<Navigate to="/home" replace />} />
          <Route path="profile" element={<Navigate to="/settings" replace />} />
          <Route path="files" element={<Navigate to="/ops" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dashboard-theme">
      <TooltipProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
