import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Note, NoteType } from '../types'

const DELETED_RETENTION_DAYS = 30

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

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
            setNotes(prev => {
              if (prev.some(n => n.id === (payload.new as Note).id)) return prev
              return [payload.new as Note, ...prev]
            })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const createNote = async (title: string, content: string, noteType: NoteType) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase.from('notes').insert({
      user_id: user.id,
      title,
      content,
      note_type: noteType,
    }).select().single()
    // Optimistically add the new note to state immediately
    if (!error && data) {
      setNotes(prev => {
        if (prev.some(n => n.id === data.id)) return prev
        return [data as Note, ...prev]
      })
    }
    return { error, data: data as Note | null }
  }

  const updateNote = async (id: string, updates: { title?: string; content?: string; note_type?: NoteType; color?: string; position?: number }) => {
    // Optimistic update for all fields so the UI reflects changes immediately
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  const updateNoteColor = async (id: string, color: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, color } : n))
    const { error } = await supabase.from('notes').update({ color }).eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  const updatePositions = async (updates: { id: string; position: number }[]) => {
    setNotes(prev => prev.map(n => {
      const u = updates.find(x => x.id === n.id)
      return u ? { ...n, position: u.position } : n
    }))
    for (const u of updates) {
      await supabase.from('notes').update({ position: u.position }).eq('id', u.id)
    }
  }

  // Soft delete: set deleted_at timestamp
  const deleteNote = async (id: string) => {
    const now = new Date().toISOString()
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted_at: now } : n))
    const { error } = await supabase.from('notes').update({ deleted_at: now }).eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  // Permanent delete: actually remove from DB
  const permanentDeleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  // Permanent delete all soft-deleted notes
  const permanentDeleteAll = async () => {
    const deletedIds = notes.filter(n => n.deleted_at).map(n => n.id)
    if (deletedIds.length === 0) return
    setNotes(prev => prev.filter(n => !n.deleted_at))
    const { error } = await supabase.from('notes').delete().in('id', deletedIds)
    if (error) fetchNotes()
    return { error }
  }

  // Restore a soft-deleted note
  const restoreNote = async (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted_at: null } : n))
    const { error } = await supabase.from('notes').update({ deleted_at: null }).eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  const archiveNote = async (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n))
    const { error } = await supabase.from('notes').update({ archived: true }).eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  const unarchiveNote = async (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, archived: false } : n))
    const { error } = await supabase.from('notes').update({ archived: false }).eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  const pinNote = async (id: string) => {
    const note = notes.find(n => n.id === id)
    const newPinned = !note?.pinned
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: newPinned } : n))
    const { error } = await supabase.from('notes').update({ pinned: newPinned }).eq('id', id)
    if (error) fetchNotes()
    return { error }
  }

  // Move note to folder
  const moveToFolder = async (noteId: string, folderId: string | null) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folder_id: folderId } : n))
    const { error } = await supabase.from('notes').update({ folder_id: folderId }).eq('id', noteId)
    if (error) fetchNotes()
    return { error }
  }

  // Bulk operations
  const bulkMoveToFolder = async (noteIds: string[], folderId: string | null) => {
    setNotes(prev => prev.map(n => noteIds.includes(n.id) ? { ...n, folder_id: folderId } : n))
    const { error } = await supabase.from('notes').update({ folder_id: folderId }).in('id', noteIds)
    if (error) fetchNotes()
    return { error }
  }

  const bulkDelete = async (noteIds: string[]) => {
    const now = new Date().toISOString()
    setNotes(prev => prev.map(n => noteIds.includes(n.id) ? { ...n, deleted_at: now } : n))
    const { error } = await supabase.from('notes').update({ deleted_at: now }).in('id', noteIds)
    if (error) fetchNotes()
    return { error }
  }

  const bulkArchive = async (noteIds: string[]) => {
    setNotes(prev => prev.map(n => noteIds.includes(n.id) ? { ...n, archived: true } : n))
    const { error } = await supabase.from('notes').update({ archived: true }).in('id', noteIds)
    if (error) fetchNotes()
    return { error }
  }

  // Filter out expired soft-deleted notes (> 30 days) and actually deleted
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DELETED_RETENTION_DAYS)

  const activeNotes = notes.filter(n => !n.archived && !n.deleted_at)
  const archivedNotes = notes.filter(n => n.archived && !n.deleted_at)
  const deletedNotes = notes.filter(n => n.deleted_at && new Date(n.deleted_at) > cutoff)

  const sortNotes = (list: Note[]) => {
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // If both have positions, sort by position ASC
      if (a.position > 0 && b.position > 0) return a.position - b.position
      if (a.position > 0) return -1
      if (b.position > 0) return 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }

  // Unfiled notes (no folder) go into basic/code sections
  const unfiledActive = activeNotes.filter(n => !n.folder_id)

  const basicNotes = sortNotes(unfiledActive.filter(n => n.note_type === 'basic' || n.note_type === 'checkbox'))
  const boardNotes = sortNotes(activeNotes.filter(n => n.note_type === 'board'))
  const codeNotes = {
    java: sortNotes(unfiledActive.filter(n => n.note_type === 'java')),
    javascript: sortNotes(unfiledActive.filter(n => n.note_type === 'javascript')),
    python: sortNotes(unfiledActive.filter(n => n.note_type === 'python')),
    sql: sortNotes(unfiledActive.filter(n => n.note_type === 'sql')),
  }

  // Notes grouped by folder
  const folderNotes: Record<string, Note[]> = {}
  for (const n of activeNotes) {
    if (n.folder_id) {
      if (!folderNotes[n.folder_id]) folderNotes[n.folder_id] = []
      folderNotes[n.folder_id].push(n)
    }
  }
  for (const fid of Object.keys(folderNotes)) {
    folderNotes[fid] = sortNotes(folderNotes[fid])
  }

  return {
    notes, basicNotes, boardNotes, codeNotes, archivedNotes, deletedNotes, folderNotes, loading,
    createNote, updateNote, updateNoteColor, updatePositions, deleteNote, permanentDeleteNote, permanentDeleteAll, restoreNote,
    archiveNote, unarchiveNote, pinNote, moveToFolder, bulkMoveToFolder, bulkDelete, bulkArchive,
  }
}
