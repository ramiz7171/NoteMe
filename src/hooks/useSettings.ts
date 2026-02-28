import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { UserSettings } from '../types'

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No settings row yet — create default
      const { data: newData } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id })
        .select()
        .single()
      if (newData) setSettings(newData as unknown as UserSettings)
    } else if (data) {
      setSettings(data as unknown as UserSettings)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('user-settings-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_settings',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setSettings(payload.new as unknown as UserSettings)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Refetch when tab becomes visible again (handles missed events during sleep/background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchSettings(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return
    // Optimistic update
    setSettings(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : prev)
    const { error } = await supabase
      .from('user_settings')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id)
    if (error) fetchSettings() // rollback
  }, [user, settings, fetchSettings])

  return { settings, loading, updateSettings }
}
