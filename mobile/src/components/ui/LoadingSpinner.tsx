import { View, ActivityIndicator, Text } from 'react-native'
import { useTheme } from '../../context/ThemeContext'

interface LoadingSpinnerProps {
  text?: string
  fullScreen?: boolean
}

export function LoadingSpinner({ text, fullScreen = true }: LoadingSpinnerProps) {
  const { colors } = useTheme()
  return (
    <View style={fullScreen ? { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background } : { padding: 20, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
      {text && <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>{text}</Text>}
    </View>
  )
}
