import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/context/ThemeContext'
import * as Haptics from 'expo-haptics'

export default function AppearanceScreen() {
  const { colors, isDark, toggleTheme } = useTheme()
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.accent} /></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Appearance</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={{ padding: 20 }}>
        <TouchableOpacity onPress={() => { toggleTheme(); Haptics.selectionAsync() }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={colors.accent} />
            <Text style={{ fontSize: 16, color: colors.text }}>Dark Mode</Text>
          </View>
          <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: isDark ? colors.accent : colors.border, justifyContent: 'center', padding: 2 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: isDark ? 'flex-end' : 'flex-start' }} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}
