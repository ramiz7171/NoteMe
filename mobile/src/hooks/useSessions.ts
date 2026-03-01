import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getDeviceInfo } from '../lib/biometric'

export interface SessionEntry {
  id: string; user_id: string; session_token: string; device_info: string
  ip_address: string; last_active_at: string; created_at: string; is_current: boolean
}

export function useSessions() {
  const { user, session } = useAuth()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentTokenRef = useRef<string | null>(null)

  const getTokenId = useCallback(() => {
    if (!session?.access_token) return ''
    return session.access_token.slice(0, 8)
  }, [session])

  const fetchSessions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('sessions').select('*').eq('user_id', user.id).order('last_active_at', { ascending: false })
    if (data) {
      const tokenId = getTokenId()
      setSessions((data as unknown as SessionEntry[]).map(s => ({ ...s, is_current: s.session_token === tokenId })))
    }
    setLoading(false)
  }, [user, getTokenId])

  useEffect(() => {
    if (!user || !session) return
    const tokenId = getTokenId()
    if (currentTokenRef.current === tokenId) return
    currentTokenRef.current = tokenId
    const register = async () => {
      const { data: existing } = await supabase.from('sessions').select('id').eq('user_id', user.id).eq('session_token', tokenId).single()
      if (existing) {
        await supabase.from('sessions').update({ last_active_at: new Date().toISOString(), device_info: getDeviceInfo() }).eq('id', existing.id)
      } else {
        await supabase.from('sessions').insert({ user_id: user.id, session_token: tokenId, device_info: getDeviceInfo(), ip_address: '', is_current: true })
      }
      fetchSessions()
    }
    register()
  }, [user, session, getTokenId, fetchSessions])

  useEffect(() => {
    if (!user) return
    heartbeatRef.current = setInterval(async () => {
      const tokenId = getTokenId()
      if (!tokenId) return
      await supabase.from('sessions').update({ last_active_at: new Date().toISOString() }).eq('user_id', user.id).eq('session_token', tokenId)
    }, 5 * 60 * 1000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [user, getTokenId])

  const revokeSession = useCallback(async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    await supabase.from('sessions').delete().eq('id', sessionId)
  }, [])

  return { sessions, loading, fetchSessions, revokeSession }
}
