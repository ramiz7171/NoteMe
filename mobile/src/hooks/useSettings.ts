import { useEffect, useState, useCallback } from 'react'
import { AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { UserSettings } from '@shared/types'

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    if (error && error.code === 'PGRST116') {
      const { data: newData } = await supabase.from('user_settings').insert({ user_id: user.id }).select().single()
      if (newData) setSettings(newData as unknown as UserSettings)
    } else if (data) {
      setSettings(data as unknown as UserSettings)
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('settings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
        (p) => { if (p.eventType === 'UPDATE' || p.eventType === 'INSERT') setSettings(p.new as unknown as UserSettings) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') fetchSettings(true) })
    return () => sub.remove()
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return
    setSettings(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : prev)
    const { error } = await supabase.from('user_settings').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('user_id', user.id)
    if (error) fetchSettings()
  }, [user, settings, fetchSettings])

  return { settings, loading, updateSettings }
}
