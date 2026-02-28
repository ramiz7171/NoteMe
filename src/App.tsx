import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { EncryptionProvider } from './context/EncryptionContext'
import { SecurityProvider, useSecurity } from './context/SecurityContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import SharedFilePage from './pages/SharedFilePage'
import LockScreen from './components/Security/LockScreen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { isLocked } = useSecurity()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  if (isLocked) return <LockScreen />

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return user ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SecurityProvider>
            <EncryptionProvider>
              <Routes>
                <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/share/:shareId" element={<SharedFilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </EncryptionProvider>
          </SecurityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
