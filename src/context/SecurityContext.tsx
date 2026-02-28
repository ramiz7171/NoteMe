import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { hashPin } from '../lib/crypto'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { verifyPasskeyCredential } from '../lib/webauthn'

const PIN_HASH_KEY = 'criptnote-pin-hash'

interface SecurityContextType {
  isLocked: boolean
  lockApp: () => void
  unlockWithPin: (pin: string) => Promise<boolean>
  unlockWithPassword: (password: string) => Promise<boolean>
  isPinEnabled: boolean
  isPasskeyEnabled: boolean
  unlockWithPasskey: () => Promise<boolean>
  setupPin: (pin: string) => Promise<void>
  removePin: () => void
  idleTimeoutMinutes: number
  setIdleTimeout: (minutes: number) => void
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isLocked, setIsLocked] = useState(false)
  const [isPinEnabled, setIsPinEnabled] = useState(false)
  const [isPasskeyEnabled, setIsPasskeyEnabled] = useState(false)
  const [idleTimeoutMinutes, setIdleTimeoutMinutesState] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(Date.now())

  // Check PIN on mount
  useEffect(() => {
    setIsPinEnabled(!!localStorage.getItem(PIN_HASH_KEY))
  }, [])

  // Check if user has passkeys
  useEffect(() => {
    if (!user) return
    const checkPasskeys = async () => {
      const { count } = await supabase
        .from('passkeys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setIsPasskeyEnabled((count ?? 0) > 0)
    }
    checkPasskeys()
  }, [user])

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

  // Idle timeout tracking
  useEffect(() => {
    if (idleTimeoutMinutes <= 0 || !user) return

    const resetTimer = () => {
      lastActivityRef.current = Date.now()
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setIsLocked(true)
      }, idleTimeoutMinutes * 60 * 1000)
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [idleTimeoutMinutes, user])

  const lockApp = useCallback(() => {
    setIsLocked(true)
  }, [])

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY)
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

  const unlockWithPasskey = useCallback(async (): Promise<boolean> => {
    if (!user) return false
    try {
      const { data: passkeys } = await supabase
        .from('passkeys')
        .select('credential_id')
        .eq('user_id', user.id)
      if (!passkeys || passkeys.length === 0) return false
      const credentialIds = passkeys.map(p => p.credential_id)
      const result = await verifyPasskeyCredential(credentialIds)
      if (result) {
        setIsLocked(false)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [user])

  const setupPin = useCallback(async (pin: string) => {
    const pinHash = await hashPin(pin)
    localStorage.setItem(PIN_HASH_KEY, pinHash)
    setIsPinEnabled(true)
  }, [])

  const removePin = useCallback(() => {
    localStorage.removeItem(PIN_HASH_KEY)
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
      isPasskeyEnabled,
      unlockWithPasskey,
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
