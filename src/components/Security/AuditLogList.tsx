import { useAuditLog, type AuditLogEntry } from '../../hooks/useAuditLog'
import { formatUserAgent } from '../../lib/parseUserAgent'

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.mfa_enable': 'Enabled 2FA',
  'auth.mfa_disable': 'Disabled 2FA',
  'note.create': 'Created note',
  'note.update': 'Updated note',
  'note.delete': 'Deleted note',
  'note.permanent_delete': 'Permanently deleted note',
  'note.restore': 'Restored note',
  'file.upload': 'Uploaded file',
  'file.delete': 'Deleted file',
  'file.share_create': 'Created share link',
  'file.share_revoke': 'Revoked share link',
  'settings.update': 'Updated settings',
  'settings.encryption_enable': 'Enabled encryption',
  'settings.encryption_disable': 'Disabled encryption',
  'settings.pin_enable': 'Enabled PIN lock',
  'settings.pin_disable': 'Disabled PIN lock',
}

const ACTION_COLORS: Record<string, string> = {
  auth: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  note: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  file: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  settings: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
}

export default function AuditLogList() {
  const { logs, loading, hasMore, loadMore } = useAuditLog()

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  if (logs.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">No activity recorded yet</p>
  }

  return (
    <div className="space-y-1.5">
      {logs.map((log: AuditLogEntry) => {
        const category = log.action.split('.')[0]
        const colorClass = ACTION_COLORS[category] || ACTION_COLORS.settings
        const d = log.details as Record<string, unknown> | null

        const browserDisplay =
          d?.browser && d?.os
            ? `${d.browser} on ${d.os}`
            : log.device_info
              ? formatUserAgent(log.device_info)
              : null

        const locationParts = [d?.city, d?.region, d?.country].filter(Boolean) as string[]
        const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : null

        const dateDisplay = new Date(log.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <div key={log.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${colorClass}`}>
              {category}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                {ACTION_LABELS[log.action] || log.action}
                {d?.title && (
                  <span className="text-gray-400 dark:text-gray-500"> — {String(d.title)}</span>
                )}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {[browserDisplay, locationDisplay, dateDisplay].filter(Boolean).join('  ·  ')}
              </p>
            </div>
          </div>
        )
      })}

      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}
