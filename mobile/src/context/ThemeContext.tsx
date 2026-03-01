import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { appStorage } from '../lib/storage'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  colors: typeof lightColors
}

const lightColors = {
  background: '#f0f0f0',
  surface: '#ffffff',
  surfaceSecondary: '#f5f5f5',
  text: '#1a1a1a',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  accent: '#3b82f6',
  accentLight: '#dbeafe',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#eab308',
  glass: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  cardBg: '#ffffff',
  inputBg: '#f9fafb',
  tabBar: '#ffffff',
  headerBg: '#ffffff',
}

const darkColors: typeof lightColors = {
  background: '#141414',
  surface: '#1e1e1e',
  surfaceSecondary: '#262626',
  text: '#f0f0f0',
  textSecondary: '#9ca3af',
  border: '#374151',
  accent: '#3b82f6',
  accentLight: '#1e3a5f',
  error: '#f87171',
  success: '#4ade80',
  warning: '#facc15',
  glass: 'rgba(30, 30, 30, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  cardBg: '#1e1e1e',
  inputBg: '#262626',
  tabBar: '#1a1a1a',
  headerBg: '#1a1a1a',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [theme, setTheme] = useState<Theme>('light')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    appStorage.get('criptnote-theme').then(stored => {
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored)
      } else if (systemScheme) {
        setTheme(systemScheme)
      }
      setLoaded(true)
    })
  }, [systemScheme])

  useEffect(() => {
    if (loaded) {
      appStorage.set('criptnote-theme', theme)
    }
  }, [theme, loaded])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))
  const isDark = theme === 'dark'
  const colors = isDark ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
