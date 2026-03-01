import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useAuditLog } from '../../src/hooks/useAuditLog'

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.mfa_enable': 'Enabled 2FA',
  'auth.mfa_disable': 'Disabled 2FA',
  'auth.recovery_codes_generate': 'Generated recovery codes',
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  auth: { bg: '#3b82f620', text: '#3b82f6' },
  note: { bg: '#22c55e20', text: '#22c55e' },
  file: { bg: '#a855f720', text: '#a855f7' },
  settings: { bg: '#f59e0b20', text: '#f59e0b' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function AuditLogScreen() {
  const { colors } = useTheme()
  const { logs, loading, hasMore, loadMore } = useAuditLog()
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Audit Log</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading && logs.length === 0 ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="list-outline" size={48} color={colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12 }}>No activity recorded yet</Text>
            </View>
          }
          ListFooterComponent={hasMore ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
          renderItem={({ item }) => {
            const category = item.action.split('.')[0]
            const catColors = CATEGORY_COLORS[category] || CATEGORY_COLORS.settings
            const label = ACTION_LABELS[item.action] || item.action
            const details = item.details as Record<string, unknown> | null

            return (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: catColors.bg }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: catColors.text, textTransform: 'uppercase' }}>{category}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {label}
                    {details?.title ? <Text style={{ color: colors.textSecondary }}> — {String(details.title)}</Text> : null}
                  </Text>
                  {item.device_info ? <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{item.device_info}</Text> : null}
                </View>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{timeAgo(item.created_at)}</Text>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}
