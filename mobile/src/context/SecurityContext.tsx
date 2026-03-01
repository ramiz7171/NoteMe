import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { hashPin } from '../lib/crypto'
import { secureStorage } from '../lib/storage'
import { authenticateWithBiometric, isBiometricAvailable } from '../lib/biometric'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const PIN_HASH_KEY = 'criptnote-pin-hash'

interface SecurityContextType {
  isLocked: boolean
  lockApp: () => void
  unlockWithPin: (pin: string) => Promise<boolean>
  unlockWithPassword: (password: string) => Promise<boolean>
  isPinEnabled: boolean
  isBiometricEnabled: boolean
  unlockWithBiometric: () => Promise<boolean>
  setupPin: (pin: string) => Promise<void>
  removePin: () => void
  idleTimeoutMinutes: number
  setIdleTimeout: (minutes: number) => Promise<void>
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isLocked, setIsLocked] = useState(false)
  const [isPinEnabled, setIsPinEnabled] = useState(false)
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false)
  const [idleTimeoutMinutes, setIdleTimeoutMinutesState] = useState(0)
  const backgroundTimeRef = useRef<number | null>(null)

  // Check PIN on mount
  useEffect(() => {
    secureStorage.get(PIN_HASH_KEY).then(hash => {
      setIsPinEnabled(!!hash)
    })
  }, [])

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setIsBiometricEnabled)
  }, [])

  // Load idle timeout from settings
  useEffect(() => {
    if (!user) return
    const loadTimeout = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .single()
      if (data?.preferences) {
        const prefs = data.preferences as Record<string, unknown>
        const timeout = prefs.idle_timeout_minutes as number
        if (timeout && timeout > 0) setIdleTimeoutMinutesState(timeout)
      }
    }
    loadTimeout()
  }, [user])

  // Idle timeout via AppState (background detection)
  useEffect(() => {
    if (idleTimeoutMinutes <= 0 || !user) return

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundTimeRef.current = Date.now()
      } else if (state === 'active' && backgroundTimeRef.current) {
        const elapsed = (Date.now() - backgroundTimeRef.current) / 1000 / 60
        if (elapsed >= idleTimeoutMinutes) {
          setIsLocked(true)
        }
        backgroundTimeRef.current = null
      }
    }

    const sub = AppState.addEventListener('change', handleAppState)
    return () => sub.remove()
  }, [idleTimeoutMinutes, user])

  const lockApp = useCallback(() => {
    setIsLocked(true)
  }, [])

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const storedHash = await secureStorage.get(PIN_HASH_KEY)
    if (!storedHash) return false
    const inputHash = await hashPin(pin)
    if (inputHash === storedHash) {
      setIsLocked(false)
      return true
    }
    return false
  }, [])

  const unlockWithPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!user?.email) return false
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (!error) {
      setIsLocked(false)
      return true
    }
    return false
  }, [user])

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    const success = await authenticateWithBiometric()
    if (success) {
      setIsLocked(false)
      return true
    }
    return false
  }, [])

  const setupPin = useCallback(async (pin: string) => {
    const pinHash = await hashPin(pin)
    await secureStorage.set(PIN_HASH_KEY, pinHash)
    setIsPinEnabled(true)
  }, [])

  const removePin = useCallback(() => {
    secureStorage.remove(PIN_HASH_KEY)
    setIsPinEnabled(false)
  }, [])

  const setIdleTimeout = useCallback(async (minutes: number) => {
    setIdleTimeoutMinutesState(minutes)
    if (!user) return
    const { data } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single()
    const existingPrefs = (data?.preferences as Record<string, unknown>) ?? {}
    await supabase
      .from('user_settings')
      .update({
        preferences: { ...existingPrefs, idle_timeout_minutes: minutes },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
  }, [user])

  return (
    <SecurityContext.Provider value={{
      isLocked,
      lockApp,
      unlockWithPin,
      unlockWithPassword,
      isPinEnabled,
      isBiometricEnabled,
      unlockWithBiometric,
      setupPin,
      removePin,
      idleTimeoutMinutes,
      setIdleTimeout,
    }}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const ctx = useContext(SecurityContext)
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider')
  return ctx
}
