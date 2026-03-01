import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import { useSessions, type SessionEntry } from '../../src/hooks/useSessions'
import * as Haptics from 'expo-haptics'

export default function SessionsScreen() {
  const { colors } = useTheme()
  const { sessions, loading, revokeSession } = useSessions()
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Active Sessions</Text>
        <View style={{ width: 22 }} />
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} /> :
      <FlatList data={sessions} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: item.is_current ? colors.accent : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="phone-portrait" size={16} color={colors.text} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.device_info}</Text>
                {item.is_current && <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.accent + '20' }}><Text style={{ fontSize: 10, color: colors.accent, fontWeight: '700' }}>Current</Text></View>}
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Last active: {new Date(item.last_active_at).toLocaleString()}</Text>
            </View>
            {!item.is_current && (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Alert.alert('Revoke', 'End this session?', [{ text: 'Cancel' }, { text: 'Revoke', style: 'destructive', onPress: () => revokeSession(item.id) }]) }}>
                <Ionicons name="close-circle" size={22} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />}
    </View>
  )
}
