import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Note, NoteType } from '../types'

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (!error && data) setNotes(data as Note[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Realtime subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotes(prev => [payload.new as Note, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setNotes(prev =>
              prev.map(n => (n.id === (payload.new as Note).id ? (payload.new as Note) : n))
            )
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id !== (payload.old as Note).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const createNote = async (title: string, content: string, noteType: NoteType) => {
    if (!user) return
    const { error } = await supabase.from('notes').insert({
      user_id: user.id,
      title,
      content,
      note_type: noteType,
    })
    return { error }
  }

  const updateNote = async (id: string, updates: { title?: string; content?: string; note_type?: NoteType }) => {
    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
    return { error }
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    return { error }
  }

  const basicNotes = notes.filter(n => n.note_type === 'basic')
  const codeNotes = {
    java: notes.filter(n => n.note_type === 'java'),
    javascript: notes.filter(n => n.note_type === 'javascript'),
    python: notes.filter(n => n.note_type === 'python'),
    sql: notes.filter(n => n.note_type === 'sql'),
  }

  return { notes, basicNotes, codeNotes, loading, createNote, updateNote, deleteNote }
}
