import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import * as Haptics from 'expo-haptics'

export default function SignupScreen() {
  const { signUp } = useAuth()
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!email || !password || !username) { setError('Please fill in all fields'); return }
    if (username !== username.toLowerCase()) { setError('Username must be lowercase'); return }
    setError('')
    setLoading(true)
    const { error: err } = await signUp(email, password, username)
    setLoading(false)
    if (err) {
      setError(err.message)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } else {
      setMessage('Check your email to confirm your account!')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 24 }}>Create Account</Text>

          {error ? <View style={{ backgroundColor: colors.error + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          </View> : null}

          {message ? <View style={{ backgroundColor: colors.success + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: colors.success, fontSize: 13 }}>{message}</Text>
          </View> : null}

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Username</Text>
          <TextInput
            style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
            value={username} onChangeText={t => setUsername(t.toLowerCase())} placeholder="username" placeholderTextColor={colors.textSecondary}
            autoCapitalize="none" autoCorrect={false}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
            value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textSecondary}
            keyboardType="email-address" autoCapitalize="none"
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Password</Text>
          <TextInput
            style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}
            value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor={colors.textSecondary} secureTextEntry
          />

          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Sign Up</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={() => router.back()}>
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
