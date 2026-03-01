import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: { icon: string; onPress: () => void }
  large?: boolean
}

export function ScreenHeader({ title, showBack = false, rightAction, large = false }: ScreenHeaderProps) {
  const { colors } = useTheme()
  const router = useRouter()

  return (
    <View style={{
      paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12,
      backgroundColor: colors.headerBg, borderBottomWidth: 0.5, borderBottomColor: colors.border,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    }}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ fontSize: large ? 28 : 18, fontWeight: '800', color: colors.text }}>{title}</Text>
      )}
      {showBack && <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>}
      {rightAction ? (
        <TouchableOpacity onPress={rightAction.onPress}>
          <Ionicons name={rightAction.icon as any} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: showBack ? 60 : 0 }} />
      )}
    </View>
  )
}
