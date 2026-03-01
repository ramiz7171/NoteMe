import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isEncrypted } from '../lib/crypto'
import type { Note, NoteType } from '../types'

const DELETED_RETENTION_DAYS = 30

interface UseNotesOptions {
  encrypt?: (content: string) => Promise<string>
  decrypt?: (content: string) => Promise<string>
}

export function useNotes(opts?: UseNotesOptions) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  // Track note IDs with pending local updates to avoid realtime overwrites
  const pendingUpdatesRef = useRef<Set<string>>(new Set())

  const decryptNote = useCallback(async (note: Note): Promise<Note> => {
    if (!opts?.decrypt || !note.content || !isEncrypted(note.content)) return note
    const content = await opts.decrypt(note.content)
    return { ...note, content }
  }, [opts])

  const decryptNotes = useCallback(async (rawNotes: Note[]): Promise<Note[]> => {
    if (!opts?.decrypt) return rawNotes
    return Promise.all(rawNotes.map(decryptNote))
  }, [opts, decryptNote])

  const fetchNotes = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (!error && data) {
      const decrypted = await decryptNotes(data as Note[])
      setNotes(decrypted)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, decryptNotes])

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
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const decrypted = await decryptNote(payload.new as Note)
            setNotes(prev => {
              if (prev.some(n => n.id === decrypted.id)) return prev
              return [decrypted, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const incoming = payload.new as Note
            // If this note has a pending local update, skip realtime to avoid overwriting
            if (pendingUpdatesRef.current.has(incoming.id)) return
            const decrypted = await decryptNote(incoming)
            setNotes(prev =>
              prev.map(n => (n.id === decrypted.id ? { ...n, ...decrypted } : n))
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
  }, [user?.id, decryptNote])

  // Refetch when tab becomes visible again (handles missed realtime events during sleep/background)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotes(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchNotes])

  const createNote = async (title: string, content: string, noteType: NoteType, expiresAt?: string | null) => {
    if (!user) return { error: new Error('Not authenticated') }
    const contentToSave = opts?.encrypt ? await opts.encrypt(content) : content
    const { data, error } = await supabase.from('notes').insert({
      user_id: user.id,
      title,
      content: contentToSave,
      note_type: noteType,
      ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
    }).select().single()
    // Optimistically add the new note to state immediately
    if (!error && data) {
      setNotes(prev => {
        if (prev.some(n => n.id === data.id)) return prev
        return [{ ...data as Note, content }, ...prev] // local state keeps plaintext
      })
    }
    return { error, data: data as Note | null }
  }

  const updateNote = async (id: string, updates: { title?: string; content?: string; note_type?: NoteType; color?: string; position?: number; expires_at?: string | null }) => {
    pendingUpdatesRef.current.add(id)
    // Optimistic update for all fields so the UI reflects changes immediately
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))

    const dbUpdates = { ...updates }
    if (dbUpdates.content && opts?.encrypt) {
      dbUpdates.content = await opts.encrypt(dbUpdates.content)
    }

    const { error } = await supabase
      .from('notes')
      .update(dbUpdates)
      .eq('id', id)
    // Delay removing from pending so the realtime echo is also skipped
    setTimeout(() => pendingUpdatesRef.current.delete(id), 1500)
    if (error) { pendingUpdatesRef.current.delete(id); fetchNotes() }
    return { error }
  }

  const updateNoteColor = async (id: string, color: string) => {
    pendingUpdatesRef.current.add(id)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, color } : n))
    const { error } = await supabase.from('notes').update({ color }).eq('id', id)
    // Delay removing from pending so the realtime echo is also skipped
    setTimeout(() => pendingUpdatesRef.current.delete(id), 1500)
    if (error) { pendingUpdatesRef.current.delete(id); fetchNotes() }
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

  // Filter out expired self-destructing notes
  const now = Date.now()
  const isExpired = (n: Note) => n.expires_at && new Date(n.expires_at).getTime() <= now

  // Client-side cleanup: permanently delete expired notes (fire-and-forget)
  useEffect(() => {
    const expired = notes.filter(isExpired)
    if (expired.length === 0) return
    const ids = expired.map(n => n.id)
    setNotes(prev => prev.filter(n => !ids.includes(n.id)))
    supabase.from('notes').delete().in('id', ids).then(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length])

  const activeNotes = notes.filter(n => !n.archived && !n.deleted_at && !isExpired(n))
  const archivedNotes = notes.filter(n => n.archived && !n.deleted_at && !isExpired(n))
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
