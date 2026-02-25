import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Folder } from '../types'

export function useFolders() {
  const { user } = useAuth()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFolders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    if (!error && data) setFolders(data as Folder[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('folders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFolders(prev => {
              if (prev.some(f => f.id === (payload.new as Folder).id)) return prev
              return [...prev, payload.new as Folder].sort((a, b) => a.name.localeCompare(b.name))
            })
          } else if (payload.eventType === 'UPDATE') {
            setFolders(prev =>
              prev.map(f => (f.id === (payload.new as Folder).id ? (payload.new as Folder) : f))
                .sort((a, b) => a.name.localeCompare(b.name))
            )
          } else if (payload.eventType === 'DELETE') {
            setFolders(prev => prev.filter(f => f.id !== (payload.old as Folder).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const createFolder = async (name: string) => {
    if (!user) return
    const { error } = await supabase.from('folders').insert({
      user_id: user.id,
      name,
    })
    return { error }
  }

  const renameFolder = async (id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
    const { error } = await supabase.from('folders').update({ name }).eq('id', id)
    if (error) fetchFolders()
    return { error }
  }

  const deleteFolder = async (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id))
    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (error) fetchFolders()
    return { error }
  }

  return { folders, loading, createFolder, renameFolder, deleteFolder }
}
