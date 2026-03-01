import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { useSecurity } from '../src/context/SecurityContext'
import { useTheme } from '../src/context/ThemeContext'

export default function Index() {
  const { user, loading } = useAuth()
  const { isLocked } = useSecurity()
  const { colors } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/(auth)/login')
    } else if (isLocked) {
      router.replace('/lock-screen')
    } else {
      router.replace('/(tabs)/(notes)')
    }
  }, [user, loading, isLocked])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  )
}
