import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Meeting } from '../types'

export function useMeetings() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeetings = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('meeting_date', { ascending: false })
    if (!error && data) setMeetings(data as unknown as Meeting[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'meetings',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMeetings(prev => {
            if (prev.some(m => m.id === (payload.new as unknown as Meeting).id)) return prev
            return [payload.new as Meeting, ...prev]
          })
        } else if (payload.eventType === 'UPDATE') {
          setMeetings(prev => prev.map(m => m.id === (payload.new as unknown as Meeting).id ? payload.new as Meeting : m))
        } else if (payload.eventType === 'DELETE') {
          setMeetings(prev => prev.filter(m => m.id !== (payload.old as unknown as Meeting).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Refetch when tab becomes visible again (handles missed realtime events during sleep/background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchMeetings(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchMeetings])

  const upcomingMeetings = useMemo(() =>
    meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress'),
  [meetings])

  const completedMeetings = useMemo(() =>
    meetings.filter(m => m.status === 'completed'),
  [meetings])

  const createMeeting = useCallback(async (data: {
    title: string
    meeting_date?: string
    participants?: string[]
    tags?: string[]
    agenda?: any[]
  }) => {
    if (!user) return null
    const { data: result, error } = await supabase
      .from('meetings')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) return { error }
    return { data: result as unknown as Meeting }
  }, [user])

  const updateMeeting = useCallback(async (id: string, updates: Partial<Meeting>) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m))
    const { error } = await supabase
      .from('meetings')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
    if (error) fetchMeetings()
    return error ? { error } : undefined
  }, [fetchMeetings])

  const deleteMeeting = useCallback(async (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id))
    const { error } = await supabase.from('meetings').delete().eq('id', id)
    if (error) fetchMeetings()
  }, [fetchMeetings])

  return { meetings, loading, upcomingMeetings, completedMeetings, createMeeting, updateMeeting, deleteMeeting }
}
