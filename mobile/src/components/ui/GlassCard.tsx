import { type ReactNode } from 'react'
import { View, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { useTheme } from '../../context/ThemeContext'

interface GlassCardProps {
  children: ReactNode
  style?: ViewStyle
  intensity?: number
  padding?: number
}

export function GlassCard({ children, style, intensity = 40, padding = 16 }: GlassCardProps) {
  const { isDark, colors } = useTheme()

  return (
    <View style={[{
      borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.glassBorder,
    }, style]}>
      <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={{ padding }}>
        {children}
      </BlurView>
    </View>
  )
}
