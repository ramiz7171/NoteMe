import { useSessions, type SessionEntry } from '../../hooks/useSessions'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Active now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function DeviceIcon({ device }: { device: string }) {
  const isMobile = /Mobile|iOS|Android/.test(device)
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {isMobile ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
      )}
    </svg>
  )
}

export default function SessionList() {
  const { sessions, loading, revokeSession } = useSessions()

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">No active sessions</p>
  }

  return (
    <div className="space-y-2">
      {sessions.map((s: SessionEntry) => (
        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="text-gray-500 dark:text-gray-400">
              <DeviceIcon device={s.device_info} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.device_info || 'Unknown'}</p>
                {s.is_current && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    Current
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {timeAgo(s.last_active_at)}
              </p>
            </div>
          </div>
          {!s.is_current && (
            <button
              onClick={() => revokeSession(s.id)}
              className="px-2 py-1 text-[10px] font-medium text-red-500 border border-red-200 dark:border-red-800/40 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Revoke
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
