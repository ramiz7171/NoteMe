import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'
import * as Haptics from 'expo-haptics'

interface FABProps {
  onPress: () => void
  icon?: string
  color?: string
}

export function FAB({ onPress, icon = 'add', color }: FABProps) {
  const { colors } = useTheme()
  const bg = color || colors.accent

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }

  return (
    <TouchableOpacity onPress={handlePress} style={{
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
      borderRadius: 28, backgroundColor: bg, justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    }}>
      <Ionicons name={icon as any} size={28} color="#fff" />
    </TouchableOpacity>
  )
}
