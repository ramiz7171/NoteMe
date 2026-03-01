import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import * as Haptics from 'expo-haptics'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const { colors, isDark } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setError('')
    setLoading(true)
    const { error: err, mfaRequired } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(err.message)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } else if (mfaRequired) {
      router.push('/(auth)/mfa-verify')
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)/(notes)')
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.accent, letterSpacing: -1 }}>CriptNote</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>Secure notes, anywhere</Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 24 }}>Sign In</Text>

          {error ? <View style={{ backgroundColor: colors.error + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          </View> : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
            value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textSecondary}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Password</Text>
          <TextInput
            style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}
            value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />

          <TouchableOpacity
            style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
            onPress={handleLogin} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign In</Text>}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 16 }}>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/magic-link')}>
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Magic Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
