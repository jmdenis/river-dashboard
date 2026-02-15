import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import OpsPage from './pages/OpsPage'
import FilesPage from './pages/FilesPage'
import FinancePage from './pages/FinancePage'
import LogsPage from './pages/LogsPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dashboard-theme">
      <BrowserRouter basename="/dash/6f0a1efff4e5f275d82c9f7d39c60e8ce0c8c2b7b5c987fc">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/ops" replace />} />
            <Route path="ops" element={<OpsPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
