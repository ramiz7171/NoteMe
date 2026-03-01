import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { ThemeProvider } from '../src/context/ThemeContext'
import { AuthProvider } from '../src/context/AuthContext'
import { SecurityProvider } from '../src/context/SecurityContext'
import { EncryptionProvider } from '../src/context/EncryptionContext'
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <SecurityProvider>
              <EncryptionProvider>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                  <Stack.Screen name="(settings)" />
                  <Stack.Screen name="lock-screen" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
                  <Stack.Screen name="share/[shareId]" />
                </Stack>
              </EncryptionProvider>
            </SecurityProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
