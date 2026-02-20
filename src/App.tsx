import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { ThemeProvider } from './components/ThemeProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import Layout from './components/Layout'
import AnimatedPage from './components/AnimatedPage'
import OpsPage from './pages/OpsPage'
import LifePage from './pages/LifePage'
import KnowledgePage from './pages/KnowledgePage'
import ProfilePage from './pages/ProfilePage'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/ops" replace />} />
          <Route path="ops" element={<AnimatedPage><OpsPage /></AnimatedPage>} />
          <Route path="home" element={<AnimatedPage><LifePage /></AnimatedPage>} />
          <Route path="knowledge" element={<AnimatedPage><KnowledgePage /></AnimatedPage>} />
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
