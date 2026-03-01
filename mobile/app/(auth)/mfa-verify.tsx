import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import * as Haptics from 'expo-haptics'

export default function MfaVerifyScreen() {
  const { verifyMfa, clearMfa } = useAuth()
  const { colors } = useTheme()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Please enter a 6-digit code'); return }
    setError('')
    setLoading(true)
    const { error: err } = await verifyMfa(code)
    setLoading(false)
    if (err) {
      setError(err.message)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)/(notes)')
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Two-Factor Authentication</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>Enter the 6-digit code from your authenticator app</Text>

        {error ? <View style={{ backgroundColor: colors.error + '15', padding: 12, borderRadius: 10, marginBottom: 16 }}>
          <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>
        </View> : null}

        <TextInput
          style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 16, fontSize: 24, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 24, textAlign: 'center', letterSpacing: 8, fontWeight: '700' }}
          value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad" maxLength={6}
        />

        <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', marginTop: 20 }} onPress={() => { clearMfa(); router.back() }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
