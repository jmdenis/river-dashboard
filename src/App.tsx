import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import AnimatedPage from './components/AnimatedPage'
import OpsPage from './pages/OpsPage'
import FilesPage from './pages/FilesPage'
import LifePage from './pages/LifePage'

import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dashboard-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/ops" replace />} />
            <Route path="ops" element={<AnimatedPage><OpsPage /></AnimatedPage>} />
            <Route path="files" element={<AnimatedPage><FilesPage /></AnimatedPage>} />
            <Route path="life" element={<AnimatedPage><LifePage /></AnimatedPage>} />

            <Route path="profile" element={<AnimatedPage><ProfilePage /></AnimatedPage>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
