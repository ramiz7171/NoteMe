import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { logAuditEvent } from '../lib/auditLog'
import type { Profile } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  mfaRequired: boolean
  mfaFactorId: string | null
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null; mfaRequired?: boolean }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  verifyMfa: (code: string) => Promise<{ error: Error | null }>
  clearMfa: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  // Check if MFA is required after sign-in
  const checkMfa = useCallback(async (): Promise<{ required: boolean; factorId: string | null }> => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        if (factorsData?.totp && factorsData.totp.length > 0) {
          return { required: true, factorId: factorsData.totp[0].id }
        }
      }
    } catch {
      // MFA check failed, proceed without MFA
    }
    return { required: false, factorId: null }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      const u = session?.user ?? null
      currentUserIdRef.current = u?.id ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id)
        // Check MFA on initial load
        const mfa = await checkMfa()
        if (mfa.required) {
          setMfaRequired(true)
          setMfaFactorId(mfa.factorId)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only clear user state on explicit sign-out, not on token refresh failures
      if (event === 'SIGNED_OUT') {
        if (currentUserIdRef.current) {
          logAuditEvent(currentUserIdRef.current, 'auth.logout')
        }
        currentUserIdRef.current = null
        setSession(null)
        setUser(null)
        setProfile(null)
        setMfaRequired(false)
        setMfaFactorId(null)
        setLoading(false)
        return
      }
      if (session) {
        // Token refresh for the same user — update session silently, skip user/profile re-set
        if (session.user.id === currentUserIdRef.current && event === 'TOKEN_REFRESHED') {
          setSession(session)
          return
        }
        currentUserIdRef.current = session.user.id
        setSession(session)
        setUser(session.user)
        fetchProfile(session.user.id)

        if (event === 'SIGNED_IN') {
          logAuditEvent(session.user.id, 'auth.login')
        }
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [checkMfa])

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}`,
      },
    })
    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error as Error | null }

    // Check if MFA is needed
    const mfa = await checkMfa()
    if (mfa.required) {
      setMfaRequired(true)
      setMfaFactorId(mfa.factorId)
      return { error: null, mfaRequired: true }
    }

    return { error: null, mfaRequired: false }
  }

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}` },
    })
    return { error: error as Error | null }
  }

  const verifyMfa = useCallback(async (code: string) => {
    if (!mfaFactorId) return { error: new Error('No MFA factor') }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: mfaFactorId,
    })
    if (challengeError) return { error: challengeError as Error }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code,
    })
    if (verifyError) return { error: verifyError as Error }

    setMfaRequired(false)
    setMfaFactorId(null)
    return { error: null }
  }, [mfaFactorId])

  const clearMfa = useCallback(() => {
    setMfaRequired(false)
    setMfaFactorId(null)
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setMfaRequired(false)
    setMfaFactorId(null)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, mfaRequired, mfaFactorId,
      signUp, signIn, signInWithMagicLink, signOut, verifyMfa, clearMfa,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
