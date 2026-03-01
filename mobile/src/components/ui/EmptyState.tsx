import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'

interface EmptyStateProps {
  icon: string
  title: string
  subtitle?: string
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme()
  return (
    <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
      <Ionicons name={icon as any} size={48} color={colors.textSecondary} />
      <Text style={{ color: colors.text, marginTop: 16, fontSize: 17, fontWeight: '600' }}>{title}</Text>
      {subtitle && <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 14, textAlign: 'center' }}>{subtitle}</Text>}
    </View>
  )
}
