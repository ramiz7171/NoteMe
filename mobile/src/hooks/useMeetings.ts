import { useEffect, useState, useCallback, useMemo } from 'react'
import { AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Meeting } from '@shared/types'

export function useMeetings() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeetings = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('meetings').select('*').eq('user_id', user.id).order('meeting_date', { ascending: false })
    if (!error && data) setMeetings(data as unknown as Meeting[])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMeetings(prev => { if (prev.some(m => m.id === (payload.new as any).id)) return prev; return [payload.new as Meeting, ...prev] })
          } else if (payload.eventType === 'UPDATE') {
            setMeetings(prev => prev.map(m => m.id === (payload.new as any).id ? payload.new as Meeting : m))
          } else if (payload.eventType === 'DELETE') {
            setMeetings(prev => prev.filter(m => m.id !== (payload.old as any).id))
          }
        }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') fetchMeetings(true) })
    return () => sub.remove()
  }, [fetchMeetings])

  const upcomingMeetings = useMemo(() => meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress'), [meetings])
  const completedMeetings = useMemo(() => meetings.filter(m => m.status === 'completed'), [meetings])

  const createMeeting = useCallback(async (data: { title: string; meeting_date?: string; participants?: string[]; tags?: string[]; agenda?: any[] }) => {
    if (!user) return null
    const { data: result, error } = await supabase.from('meetings').insert({ ...data, user_id: user.id }).select().single()
    if (error) return { error }
    return { data: result as unknown as Meeting }
  }, [user])

  const updateMeeting = useCallback(async (id: string, updates: Partial<Meeting>) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m))
    const { error } = await supabase.from('meetings').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id)
    if (error) fetchMeetings()
  }, [fetchMeetings])

  const deleteMeeting = useCallback(async (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id))
    await supabase.from('meetings').delete().eq('id', id)
  }, [])

  return { meetings, loading, upcomingMeetings, completedMeetings, createMeeting, updateMeeting, deleteMeeting, refetch: fetchMeetings }
}
