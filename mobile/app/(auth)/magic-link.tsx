import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'

export default function MagicLinkScreen() {
  const { signInWithMagicLink } = useAuth()
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!email) { setError('Please enter your email'); return }
    setError('')
    setLoading(true)
    const { error: err } = await signInWithMagicLink(email)
    setLoading(false)
    if (err) setError(err.message)
    else setMessage('Check your email for the magic link!')
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Magic Link</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>We'll send you a login link via email</Text>

          {error ? <View style={{ backgroundColor: colors.error + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
          </View> : null}
          {message ? <View style={{ backgroundColor: colors.success + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: colors.success, fontSize: 13 }}>{message}</Text>
          </View> : null}

          <TextInput
            style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}
            value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textSecondary}
            keyboardType="email-address" autoCapitalize="none"
          />

          <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleSend} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Send Magic Link</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={() => router.back()}>
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
