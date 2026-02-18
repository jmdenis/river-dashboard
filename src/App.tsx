import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import AnimatedPage from './components/AnimatedPage'
import OpsPage from './pages/OpsPage'
import LifePage from './pages/LifePage'
import KnowledgePage from './pages/KnowledgePage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dashboard-theme">
      <BrowserRouter>
        <Routes>
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
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
