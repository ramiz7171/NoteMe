import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useSettings } from '../../src/hooks/useSettings'
import * as Haptics from 'expo-haptics'

function ToggleRow({ label, value, onToggle, colors }: { label: string; value: boolean; onToggle: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={() => { onToggle(); Haptics.selectionAsync() }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 15, color: colors.text }}>{label}</Text>
      <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: value ? colors.accent : colors.border, justifyContent: 'center', padding: 2 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const { colors } = useTheme()
  const { settings, updateSettings } = useSettings()
  const router = useRouter()
  const notifs = settings?.notifications || { email_summaries: false, meeting_reminders: true, transcript_ready: true }

  const toggle = (key: string) => {
    updateSettings({ notifications: { ...notifs, [key]: !(notifs as any)[key] } as any })
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={{ padding: 20, backgroundColor: colors.surface, margin: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
        <ToggleRow label="Email Summaries" value={notifs.email_summaries} onToggle={() => toggle('email_summaries')} colors={colors} />
        <ToggleRow label="Meeting Reminders" value={notifs.meeting_reminders} onToggle={() => toggle('meeting_reminders')} colors={colors} />
        <ToggleRow label="Transcript Ready" value={notifs.transcript_ready} onToggle={() => toggle('transcript_ready')} colors={colors} />
      </View>
    </View>
  )
}
