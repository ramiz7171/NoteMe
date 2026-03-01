import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface AuditLogEntry {
  id: string
  user_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  device_info: string
  created_at: string
}

const INITIAL_PAGE_SIZE = 4
const PAGE_SIZE = 10

export function useAuditLog() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  const fetchLogs = useCallback(async (offset = 0) => {
    if (!user) return
    if (offset === 0) setLoading(true)
    const limit = offset === 0 ? INITIAL_PAGE_SIZE : PAGE_SIZE
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!error && data) {
      const entries = data as unknown as AuditLogEntry[]
      if (offset === 0) {
        setLogs(entries)
      } else {
        setLogs(prev => [...prev, ...entries])
      }
      setHasMore(entries.length === limit)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const loadMore = useCallback(() => {
    fetchLogs(logs.length)
  }, [fetchLogs, logs.length])

  return { logs, loading, hasMore, loadMore, refetch: () => fetchLogs(0) }
}
