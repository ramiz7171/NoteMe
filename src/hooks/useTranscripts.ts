import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Transcript } from '../types'

export function useTranscripts() {
  const { user } = useAuth()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTranscripts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (!error && data) setTranscripts(data as unknown as Transcript[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => { fetchTranscripts() }, [fetchTranscripts])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('transcripts-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transcripts',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTranscripts(prev => {
            if (prev.some(t => t.id === (payload.new as unknown as Transcript).id)) return prev
            return [payload.new as Transcript, ...prev]
          })
        } else if (payload.eventType === 'UPDATE') {
          setTranscripts(prev => prev.map(t => t.id === (payload.new as unknown as Transcript).id ? payload.new as Transcript : t))
        } else if (payload.eventType === 'DELETE') {
          setTranscripts(prev => prev.filter(t => t.id !== (payload.old as unknown as Transcript).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Refetch when tab becomes visible again (handles missed realtime events during sleep/background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchTranscripts()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchTranscripts])

  const createTranscript = useCallback(async (data: {
    title: string
    transcript_text?: string
    speaker_segments?: any[]
    summary?: string
    action_items?: string
    audio_url?: string
    status?: string
    duration_seconds?: number
    tags?: string[]
  }) => {
    if (!user) return null
    const { data: result, error } = await supabase
      .from('transcripts')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) return { error }
    return { data: result as unknown as Transcript }
  }, [user])

  const updateTranscript = useCallback(async (id: string, updates: Partial<Transcript>) => {
    setTranscripts(prev => prev.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    const { error } = await supabase
      .from('transcripts')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
    if (error) fetchTranscripts()
    return error ? { error } : undefined
  }, [fetchTranscripts])

  const deleteTranscript = useCallback(async (id: string) => {
    setTranscripts(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('transcripts').delete().eq('id', id)
    if (error) fetchTranscripts()
  }, [fetchTranscripts])

  return { transcripts, loading, createTranscript, updateTranscript, deleteTranscript }
}
