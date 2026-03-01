import { type ReactNode } from 'react'
import { TouchableOpacity, Text, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { useTheme } from '../../context/ThemeContext'
import * as Haptics from 'expo-haptics'

interface GlassButtonProps {
  children: ReactNode
  onPress: () => void
  style?: ViewStyle
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export function GlassButton({ children, onPress, style, variant = 'primary', disabled }: GlassButtonProps) {
  const { isDark, colors } = useTheme()

  const bgColors = {
    primary: colors.accent,
    secondary: 'transparent',
    danger: colors.error,
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[{
        borderRadius: 12, overflow: 'hidden', opacity: disabled ? 0.5 : 1,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: colors.border,
      }, style]}
    >
      <BlurView intensity={variant === 'secondary' ? 30 : 0} tint={isDark ? 'dark' : 'light'}
        style={{
          paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center',
          backgroundColor: variant === 'secondary' ? undefined : bgColors[variant],
        }}>
        {typeof children === 'string' ? (
          <Text style={{ fontSize: 16, fontWeight: '600', color: variant === 'secondary' ? colors.text : '#fff' }}>{children}</Text>
        ) : children}
      </BlurView>
    </TouchableOpacity>
  )
}
